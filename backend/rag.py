"""
RAG 模块 — 用 ChromaDB 存储 sketch 向量，替代之前的手写 JSON 方案
"""
import os
import json
from pathlib import Path
from openai import OpenAI
import chromadb
from dotenv import load_dotenv

load_dotenv()

SKETCHES_DIR = Path(__file__).parent.parent / "public" / "sketches"

_client = None
_collection = None


def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.environ["ALIYUN_API_KEY"],
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
    return _client


def _get_collection():
    global _collection
    if _collection is None:
        chroma = chromadb.PersistentClient(path="./data/chroma")
        _collection = chroma.get_or_create_collection("sketches")
    return _collection


def _embed(text: str) -> list[float]:
    response = _get_client().embeddings.create(
        model="text-embedding-v3",
        input=text
    )
    return response.data[0].embedding


def build_index():
    """读取 public/sketches/*.js，向量化并存入 ChromaDB"""
    sketch_files = list(SKETCHES_DIR.glob("*.js"))
    print(f"Building index from {len(sketch_files)} sketches...")

    for js_file in sketch_files:
        name = js_file.stem
        code = js_file.read_text()

        meta = {}
        meta_file = js_file.with_suffix(".meta.json")
        if meta_file.exists():
            meta = json.loads(meta_file.read_text())

        # 向量化风格描述（比原始代码语义更强）
        text_to_embed = " ".join(filter(None, [
            meta.get("style_notes"),
            meta.get("mood"),
            meta.get("why_i_like_it")
        ])) or code

        vector = _embed(text_to_embed)

        _get_collection().upsert(
            ids=[name],
            embeddings=[vector],
            documents=[code],
            metadatas=[{
                "file": js_file.name,
                "style_notes": meta.get("style_notes", ""),
                "mood": meta.get("mood", ""),
                "palette": meta.get("palette", ""),
                "motion": meta.get("motion", ""),
                "why_i_like_it": meta.get("why_i_like_it", "")
            }]
        )
        print(f"  ✓ {js_file.name}")

    print("Index built.")
    return len(sketch_files)


def query(prompt: str, top_k: int = 2) -> str:
    """搜索相似风格 sketch，返回注入 system prompt 的 context 字符串"""
    col = _get_collection()
    if col.count() == 0:
        return ""

    vector = _embed(prompt)
    results = col.query(query_embeddings=[vector], n_results=top_k)

    context_parts = []
    for i, meta in enumerate(results["metadatas"][0]):
        lines = [f"Reference: {meta['file']}"]
        if meta.get("style_notes"): lines.append(f"Style: {meta['style_notes']}")
        if meta.get("mood"):        lines.append(f"Mood: {meta['mood']}")
        if meta.get("palette"):     lines.append(f"Palette: {meta['palette']}")
        if meta.get("motion"):      lines.append(f"Motion: {meta['motion']}")
        if meta.get("why_i_like_it"): lines.append(f"Why: {meta['why_i_like_it']}")
        context_parts.append("\n".join(lines))

    return "\n\n---\n\n".join(context_parts)
