"""
个人风格档案系统

两个来源：
  1. auto_extracted — 分析 sketch 代码后自动提取的风格特征
  2. user_stated    — 用户自己描述的偏好

两者合并成 synthesis，注入到每次 Builder 的 system prompt 里。
"""
import json
from pathlib import Path
from backend.llm import call_llm

PROFILE_PATH = Path("./data/style_profile.json")

EXTRACT_PROMPT = """You are analyzing a collection of p5.js sketches to extract the artist's visual style.

Based on the sketches provided, identify:
- color_palette: typical colors, tones, contrast levels
- motion_type: how things move (drift, explode, pulse, spread, etc.)
- density: sparse or dense, how many elements
- structure: geometry, typography, organic, grid, radial, etc.
- mood: the emotional quality (meditative, unsettling, playful, etc.)
- recurring_elements: things that appear across multiple works

Be specific and concrete. Use comma-separated phrases, not full sentences.
Return ONLY a JSON object with these exact keys."""

SYNTHESIS_PROMPT = """You are synthesizing a creative artist's style profile.

You have two inputs:
1. Auto-extracted style features (from code analysis)
2. The artist's own words about their preferences

Write a 2-3 sentence style brief that a collaborator could use to generate work that feels authentically like this artist's.
Be specific, evocative, and actionable. Avoid generic phrases like "visually interesting" or "aesthetically pleasing"."""


def load_profile() -> dict:
    if PROFILE_PATH.exists():
        return json.loads(PROFILE_PATH.read_text())
    return {
        "auto_extracted": {},
        "user_stated": "",
        "synthesis": ""
    }


def save_profile(profile: dict):
    PROFILE_PATH.parent.mkdir(exist_ok=True)
    PROFILE_PATH.write_text(json.dumps(profile, indent=2, ensure_ascii=False))


def analyze_sketches(sketch_dir: str = "./public/sketches") -> dict:
    """读取所有 sketch + meta，让 LLM 归纳风格特征"""
    sketches_path = Path(sketch_dir)
    sketch_texts = []

    for js_file in sketches_path.glob("*.js"):
        code = js_file.read_text()
        meta = {}
        meta_file = js_file.with_suffix(".meta.json")
        if meta_file.exists():
            meta = json.loads(meta_file.read_text())

        entry = f"=== {js_file.name} ===\n"
        if meta.get("style_notes"):
            entry += f"Style notes: {meta['style_notes']}\n"
        entry += f"Code snippet (first 400 chars):\n{code[:400]}"
        sketch_texts.append(entry)

    if not sketch_texts:
        return {}

    combined = "\n\n".join(sketch_texts)
    raw = call_llm(EXTRACT_PROMPT, f"Analyze these sketches:\n\n{combined}")

    # 提取 JSON
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except Exception:
        return {"raw": raw}


def update_user_statement(statement: str):
    """更新用户自述部分，并重新合成 synthesis"""
    profile = load_profile()
    profile["user_stated"] = statement

    if profile["auto_extracted"]:
        _regenerate_synthesis(profile)

    save_profile(profile)
    return profile


def rebuild_profile() -> dict:
    """重新分析所有 sketch，更新 auto_extracted 和 synthesis"""
    profile = load_profile()
    profile["auto_extracted"] = analyze_sketches()

    if profile["auto_extracted"]:
        _regenerate_synthesis(profile)

    save_profile(profile)
    return profile


def _regenerate_synthesis(profile: dict):
    context = f"Auto-extracted features:\n{json.dumps(profile['auto_extracted'], indent=2)}"
    if profile.get("user_stated"):
        context += f"\n\nArtist's own words:\n{profile['user_stated']}"
    profile["synthesis"] = call_llm(SYNTHESIS_PROMPT, context)


def get_style_brief() -> str:
    """返回注入 system prompt 用的风格简报"""
    profile = load_profile()
    if profile.get("synthesis"):
        return profile["synthesis"]
    if profile.get("auto_extracted"):
        features = profile["auto_extracted"]
        return " | ".join(f"{k}: {v}" for k, v in features.items() if v)
    return ""
