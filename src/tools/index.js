/**
 * Agent 可调用的工具定义 + 执行逻辑
 */
import { query as ragQuery } from '../rag/index.js'

// ── 工具定义（发给模型的 schema）──────────────────────────────────────────────

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_style',
      description: 'Search the user\'s sketch library for works with similar visual style or mood. Use this before generating to understand the user\'s aesthetic preferences.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'A description of the visual style or mood to search for'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_sketch',
      description: 'Generate a p5.js sketch. Call this after searching for style references.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'What the sketch should look like'
          },
          style_context: {
            type: 'string',
            description: 'Style references from search_style, or empty string if none'
          }
        },
        required: ['description', 'style_context']
      }
    }
  }
]

// ── 工具执行 ──────────────────────────────────────────────────────────────────

export async function executeTool(name, args) {
  switch (name) {
    case 'search_style': {
      const context = await ragQuery(args.query)
      return context || 'No matching sketches found in the library.'
    }

    case 'generate_sketch': {
      // 这个工具的结果由外层 callLLM 处理，这里只返回参数让外层知道要生成
      // 实际生成在 agentic loop 结束后进行
      return JSON.stringify({ description: args.description, style_context: args.style_context })
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
