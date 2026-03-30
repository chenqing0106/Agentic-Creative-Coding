"""
LLM 调用模块 — 阿里通义千问（OpenAI 兼容接口）
"""
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

MODEL = "qwen-plus"

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.environ["ALIYUN_API_KEY"],
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
    return _client


def call_llm(system_prompt: str, user_message: str) -> str:
    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
    )
    return response.choices[0].message.content
