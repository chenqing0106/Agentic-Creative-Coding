/**
 * Claude API 适配器
 */
import Anthropic from '@anthropic-ai/sdk'
import { getModelName } from '../config.js'

class ClaudeAdapter {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey })
    this.model = getModelName()
  }

  async call(systemPrompt, userMessage) {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })

    return message.content[0].text
  }
}

export default ClaudeAdapter
