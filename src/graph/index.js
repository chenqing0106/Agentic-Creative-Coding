/**
 * LangGraph — 多角色状态机
 *
 * 四个角色：
 *   Muse    — 生成创意 idea 和提示
 *   Critic  — 分析 sketch 风格，指出与你美学的关系
 *   Builder — 生成可运行的 p5.js 代码
 *   Curator — 分析你的 sketch 库，发现隐藏模式
 *
 * 流程：用户输入 → router 判断意图 → 对应角色处理 → 输出
 */
import { StateGraph, END } from '@langchain/langgraph'
import { callLLM } from '../llm/index.js'
import { query as ragQuery } from '../rag/index.js'
import { TOOLS, executeTool } from '../tools/index.js'

// ── State 定义 ────────────────────────────────────────────────────────────────

const State = {
  mode: null,        // 'muse' | 'critic' | 'builder' | 'curator'
  userInput: null,   // 用户输入的文字
  sketchCode: null,  // 用户提供的现有代码（Critic 用）
  context: null,     // RAG 搜索结果
  result: null       // 最终输出
}

// ── System Prompts ────────────────────────────────────────────────────────────

const PROMPTS = {
  router: `You are a creative coding assistant router. Based on the user's message, decide which mode to use:
- "builder": user wants to generate or create a new p5.js sketch
- "muse": user wants creative ideas, inspiration, or prompts to explore
- "critic": user wants to analyze or get feedback on existing code/style
- "curator": user wants to understand patterns or themes across their sketch collection

Reply with ONLY one word: builder, muse, critic, or curator.`,

  muse: `You are Muse, a creative provocateur for a generative artist.
You've studied their sketch library and understand their aesthetic instincts.
Your job is to generate unexpected, specific, evocative creative prompts — not generic suggestions.
Push toward the edges of their style. Be poetic but concrete.
Give 3-5 prompts, each 1-2 sentences.`,

  critic: `You are Critic, an sharp-eyed analyst who knows this artist's body of work.
When shown a sketch or description, you identify: what visual language it uses, how it connects to or breaks from their usual aesthetic, what's interesting or unresolved.
Be specific and honest. Reference their actual work style when relevant.
Keep it under 200 words.`,

  builder: `You are Builder, a skilled p5.js engineer.
You have access to the user's style references via search_style tool.
Always call search_style first, then generate_sketch with the style context.
Output ONLY valid p5.js code — no markdown, no explanation.
Include setup() and draw(). Canvas 600x600. No external libraries.`,

  curator: `You are Curator, an archivist who sees patterns others miss.
You have access to the user's sketch library via search_style tool.
When asked, use search_style to explore their collection, then synthesize observations about recurring themes, motifs, color tendencies, motion preferences, and aesthetic evolution.
Be insightful, specific, and brief.`
}

// ── Nodes ─────────────────────────────────────────────────────────────────────

async function routerNode(state) {
  if (state.mode) return { mode: state.mode }
  const mode = await callLLM(PROMPTS.router, state.userInput)
  return { mode: mode.trim().toLowerCase() }
}

async function museNode(state) {
  const context = await ragQuery(state.userInput)
  const systemPrompt = context
    ? `${PROMPTS.muse}\n\nUser's style references:\n${context}`
    : PROMPTS.muse
  const result = await callLLM(systemPrompt, state.userInput)
  return { result }
}

async function criticNode(state) {
  const context = await ragQuery(state.userInput)
  const systemPrompt = context
    ? `${PROMPTS.critic}\n\nUser's style references:\n${context}`
    : PROMPTS.critic
  const input = state.sketchCode
    ? `Analyze this sketch:\n\n${state.sketchCode}`
    : state.userInput
  const result = await callLLM(systemPrompt, input)
  return { result }
}

async function builderNode(state) {
  const result = await callLLM(PROMPTS.builder, state.userInput)
  return { result }
}

async function curatorNode(state) {
  const result = await callLLM(PROMPTS.curator, state.userInput)
  return { result }
}

// ── Graph 组装 ────────────────────────────────────────────────────────────────

function routeToMode(state) {
  const valid = ['muse', 'critic', 'builder', 'curator']
  return valid.includes(state.mode) ? state.mode : 'builder'
}

const graph = new StateGraph({ channels: State })

graph.addNode('router', routerNode)
graph.addNode('muse', museNode)
graph.addNode('critic', criticNode)
graph.addNode('builder', builderNode)
graph.addNode('curator', curatorNode)

graph.setEntryPoint('router')
graph.addConditionalEdges('router', routeToMode, {
  muse: 'muse',
  critic: 'critic',
  builder: 'builder',
  curator: 'curator'
})
graph.addEdge('muse', END)
graph.addEdge('critic', END)
graph.addEdge('builder', END)
graph.addEdge('curator', END)

export const app = graph.compile()

/**
 * 对外暴露的主入口
 * @param {string} userInput
 * @param {string|null} sketchCode  — 可选，传入现有代码供 Critic 分析
 * @returns {{ mode: string, result: string }}
 */
export async function runAgent(userInput, sketchCode = null, mode = null) {
  const output = await app.invoke({ userInput, sketchCode, mode })
  return { mode: output.mode, result: output.result }
}
