"""
LangGraph — 多角色状态机
Muse / Critic / Builder / Curator
"""
import os
import json
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from openai import OpenAI
from dotenv import load_dotenv
from backend.rag import query as rag_query
from backend.tools import TOOLS, execute_tool
from backend.style_profile import get_style_brief

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


# ── State ─────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    mode: Optional[str]
    user_input: str
    sketch_code: Optional[str]
    result: Optional[str]


# ── System Prompts ────────────────────────────────────────────────────────────

PROMPTS = {
    "router": """You are a creative coding assistant router. Based on the user's message, decide which mode to use:
- "builder": user wants to generate or create a new p5.js sketch
- "muse": user wants creative ideas, inspiration, or prompts to explore
- "critic": user wants to analyze or get feedback on existing code/style
- "curator": user wants to understand patterns or themes across their sketch collection

Reply with ONLY one word: builder, muse, critic, or curator.""",

    "muse": """You are Muse, a creative provocateur for a generative artist.
You've studied their sketch library and understand their aesthetic instincts.
Generate unexpected, specific, evocative creative prompts — not generic suggestions.
Push toward the edges of their style. Be poetic but concrete.
Give 3-5 prompts, each 1-2 sentences.""",

    "critic": """You are Critic, a sharp-eyed analyst who knows this artist's body of work.
When shown a sketch or description, identify: what visual language it uses, how it connects to or breaks from their usual aesthetic, what's interesting or unresolved.
Be specific and honest. Reference their actual work style when relevant.
Keep it under 200 words.""",

    "builder": """You are Builder, a skilled p5.js engineer working for a specific artist.
You have access to their style references via search_style tool.
Always call search_style first, then generate_sketch with the style context.
Output ONLY valid p5.js code — no markdown, no explanation.
Include setup() and draw(). Canvas 600x600. No external libraries.
{style_brief}""",

    "curator": """You are Curator, an archivist who sees patterns others miss.
You have access to the user's sketch library via search_style tool.
Use search_style to explore their collection, then synthesize observations about recurring themes, motifs, color tendencies, motion preferences, and aesthetic evolution.
Be insightful, specific, and brief."""
}


# ── LLM with tool calling loop ────────────────────────────────────────────────

def call_with_tools(system_prompt: str, user_message: str) -> str:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

    while True:
        response = _get_client().chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS
        )
        msg = response.choices[0].message
        messages.append(msg)

        if not msg.tool_calls:
            return msg.content

        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            print(f"  → tool: {tc.function.name} {args}")
            result = execute_tool(tc.function.name, args)
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result
            })


# ── Nodes ─────────────────────────────────────────────────────────────────────

def router_node(state: AgentState) -> AgentState:
    if state.get("mode"):
        return state
    from backend.llm import call_llm
    mode = call_llm(PROMPTS["router"], state["user_input"]).strip().lower()
    return {**state, "mode": mode}


def muse_node(state: AgentState) -> AgentState:
    context = rag_query(state["user_input"])
    prompt = PROMPTS["muse"] + (f"\n\nUser's style references:\n{context}" if context else "")
    from backend.llm import call_llm
    result = call_llm(prompt, state["user_input"])
    return {**state, "result": result}


def critic_node(state: AgentState) -> AgentState:
    context = rag_query(state["user_input"])
    prompt = PROMPTS["critic"] + (f"\n\nUser's style references:\n{context}" if context else "")
    user_msg = f"Analyze this sketch:\n\n{state['sketch_code']}" if state.get("sketch_code") else state["user_input"]
    from backend.llm import call_llm
    result = call_llm(prompt, user_msg)
    return {**state, "result": result}


def builder_node(state: AgentState) -> AgentState:
    style_brief = get_style_brief()
    prompt = PROMPTS["builder"].format(
        style_brief=f"\nArtist style brief: {style_brief}" if style_brief else ""
    )
    result = call_with_tools(prompt, state["user_input"])
    return {**state, "result": result}


def curator_node(state: AgentState) -> AgentState:
    result = call_with_tools(PROMPTS["curator"], state["user_input"])
    return {**state, "result": result}


def route_to_mode(state: AgentState) -> str:
    valid = {"muse", "critic", "builder", "curator"}
    return state["mode"] if state["mode"] in valid else "builder"


# ── Graph 组装 ────────────────────────────────────────────────────────────────

workflow = StateGraph(AgentState)
workflow.add_node("router", router_node)
workflow.add_node("muse", muse_node)
workflow.add_node("critic", critic_node)
workflow.add_node("builder", builder_node)
workflow.add_node("curator", curator_node)

workflow.set_entry_point("router")
workflow.add_conditional_edges("router", route_to_mode, {
    "muse": "muse",
    "critic": "critic",
    "builder": "builder",
    "curator": "curator"
})
for node in ["muse", "critic", "builder", "curator"]:
    workflow.add_edge(node, END)

agent = workflow.compile()


async def run_agent(user_input: str, sketch_code: str = None, mode: str = None) -> dict:
    output = await agent.ainvoke({
        "user_input": user_input,
        "sketch_code": sketch_code,
        "mode": mode,
        "result": None
    })
    return {"mode": output["mode"], "result": output["result"]}
