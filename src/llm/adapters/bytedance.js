/**
 * 字节豆包适配器
 * 支持 OpenAI 兼容的 API 格式
 * 文档: https://www.volcengine.com/docs/82379/1099475
 */
import { getModelName } from '../config.js'

class BytedanceAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.model = getModelName()
    // 豆包支持 OpenAI 兼容的端点
    this.endpoint = 'https://ark.cn-beijing.volces.com/api/v3/messages'
  }

  async call(systemPrompt, userMessage) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Bytedance API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.content[0].text || data.message?.content || ''
  }
}

export default BytedanceAdapter
