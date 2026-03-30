"""
Agent 工具定义 — 供 LangGraph 节点调用
"""
from backend.rag import query as rag_query

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_style",
            "description": "Search the user's sketch library for works with similar visual style or mood. Use this before generating to understand the user's aesthetic preferences.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A description of the visual style or mood to search for"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_sketch",
            "description": "Generate a p5.js sketch. Call this after searching for style references.",
            "parameters": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "style_context": {"type": "string"}
                },
                "required": ["description", "style_context"]
            }
        }
    }
]


def execute_tool(name: str, args: dict) -> str:
    if name == "search_style":
        return rag_query(args["query"]) or "No matching sketches found."
    if name == "generate_sketch":
        import json
        return json.dumps(args)
    raise ValueError(f"Unknown tool: {name}")
