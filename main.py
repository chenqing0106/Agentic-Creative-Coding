"""
FastAPI 后端入口
- 静态文件（public/）由 Node.js 的 server.js 继续 serve
- 这里只处理 /api/* 的 agent 接口
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import json as _json
from pathlib import Path
from backend.graph import run_agent, run_agent_stream
from backend.rag import build_index
from backend.style_profile import rebuild_profile, update_user_statement, load_profile

load_dotenv()

app = FastAPI()


class GenerateRequest(BaseModel):
    description: str
    mode: str | None = None
    sketch_code: str | None = None


@app.post("/api/generate")
async def generate(req: GenerateRequest):
    result = await run_agent(req.description, req.sketch_code, req.mode)
    return {"mode": result["mode"], "code": result["result"]}


@app.post("/api/generate/stream")
async def generate_stream(req: GenerateRequest):
    async def event_generator():
        try:
            async for event in run_agent_stream(req.description, req.sketch_code, req.mode):
                yield f"data: {_json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {_json.dumps({'type': 'error', 'text': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@app.get("/api/sketches")
def list_sketches():
    sketches_dir = Path("./public/sketches")
    result = {"own": [], "collected": []}
    import json as _json

    for js_file in sorted(sketches_dir.glob("*.js")):
        meta = {}
        meta_file = js_file.with_suffix(".meta.json")
        if meta_file.exists():
            meta = _json.loads(meta_file.read_text())

        entry = {
            "name": js_file.stem,
            "file": js_file.name,
            "title": meta.get("title", js_file.stem),
            "mood": meta.get("mood", ""),
            "source": meta.get("source", "own")
        }
        group = "collected" if meta.get("source") == "collected" else "own"
        result[group].append(entry)

    return result


@app.delete("/api/sketches/{name}")
async def delete_sketch(name: str):
    from fastapi.concurrency import run_in_threadpool
    sketches_dir = Path("./public/sketches")

    js_file = sketches_dir / f"{name}.js"
    meta_file = sketches_dir / f"{name}.meta.json"

    if not js_file.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Sketch not found")

    js_file.unlink()
    if meta_file.exists():
        meta_file.unlink()

    count = await run_in_threadpool(build_index)
    await run_in_threadpool(rebuild_profile)
    return {"ok": True, "total": count}


@app.post("/api/build-index")
async def build_index_endpoint():
    count = build_index()
    return {"ok": True, "count": count}


class SaveSketchRequest(BaseModel):
    name: str
    code: str
    source: str = "collected"


@app.post("/api/save-sketch")
async def save_sketch(req: SaveSketchRequest):
    """保存收藏的 sketch，并自动重建索引和风格档案"""
    from fastapi.concurrency import run_in_threadpool

    safe_name = req.name.strip().lower()
    safe_name = "".join(c if c.isalnum() or c == "-" else "-" for c in safe_name).strip("-")
    file_path = Path("./public/sketches") / f"{safe_name}.js"

    file_path.write_text(req.code)
    meta_path = Path("./public/sketches") / f"{safe_name}.meta.json"
    import json as _json
    source = req.source if req.source in ("own", "collected") else "collected"
    meta_path.write_text(_json.dumps({"source": source}, indent=2))

    count = await run_in_threadpool(build_index)
    await run_in_threadpool(rebuild_profile)

    return {"ok": True, "file": f"{safe_name}.js", "total": count}


class StyleRequest(BaseModel):
    statement: str


@app.post("/api/build-style")
async def build_style():
    """分析所有 sketch，重新生成风格档案"""
    from fastapi.concurrency import run_in_threadpool
    profile = await run_in_threadpool(rebuild_profile)
    return {"ok": True, "synthesis": profile.get("synthesis", "")}


@app.post("/api/style-statement")
async def style_statement(req: StyleRequest):
    """更新用户自述偏好"""
    from fastapi.concurrency import run_in_threadpool
    profile = await run_in_threadpool(update_user_statement, req.statement)
    return {"ok": True, "synthesis": profile.get("synthesis", "")}


@app.get("/api/style-profile")
def style_profile():
    return load_profile()


@app.get("/api/config")
def config():
    import os
    return {
        "provider": "aliyun",
        "model": "qwen-plus",
        "api_key_set": bool(os.environ.get("ALIYUN_API_KEY"))
    }

# 静态文件放最后，避免拦截 /api 路由
app.mount("/", StaticFiles(directory="public", html=True), name="static")
