/**
 * OpenAI 兼容适配器
 * 支持所有兼容 OpenAI API 格式的服务
 * 包括: Azure OpenAI, LocalAI, Ollama via OpenAI proxy
 */
import { getModelName } from '../config.js'

class OpenAICompatAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.model = getModelName()
    // 可以通过环境变量覆盖
    this.endpoint = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  }

  async call(systemPrompt, userMessage) {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }
}

export default OpenAICompatAdapter
