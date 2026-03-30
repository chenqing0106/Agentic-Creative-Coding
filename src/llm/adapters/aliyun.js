/**
 * 阿里通义千问适配器
 * 使用 OpenAI 兼容接口（阿里推荐方式）
 * 文档: https://help.aliyun.com/zh/dashscope/developer-reference/compatibility-of-openai-with-dashscope
 */
import { getModelName } from '../config.js'
import { TOOLS, executeTool } from '../../tools/index.js'

class AliyunAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.model = getModelName()
    this.endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  }

  async _request(messages, useTools) {
    const body = { model: this.model, messages }
    if (useTools) body.tools = TOOLS

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    if (!response.ok) throw new Error(`Aliyun API error: ${data.error?.message || response.statusText}`)
    return data.choices[0].message
  }

  async call(systemPrompt, userMessage) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]

    // Agentic loop：模型可以多次调用工具，直到返回最终文本
    while (true) {
      const message = await this._request(messages, true)
      messages.push(message)

      // 没有 tool_calls，说明模型已经给出最终答案
      if (!message.tool_calls?.length) {
        return message.content
      }

      // 执行所有 tool calls，把结果追加到 messages
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments)
        console.log(`  → calling tool: ${toolCall.function.name}`, args)

        const result = await executeTool(toolCall.function.name, args)

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        })
      }
    }
  }
}

export default AliyunAdapter
