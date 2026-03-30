/**
 * LLM 工厂 - 通过工厂模式实例化正确的适配器
 * 这是整个系统的调用入口
 */
import { LLM_CONFIG, getModelName } from './config.js'
import ClaudeAdapter from './adapters/claude.js'
import AliyunAdapter from './adapters/aliyun.js'
import BytedanceAdapter from './adapters/bytedance.js'
import OpenAICompatAdapter from './adapters/openai.js'

let adapterInstance = null

/**
 * 获取或创建 LLM 适配器实例
 * @returns {Adapter} 返回对应的适配器实例
 */
function getLLMAdapter() {
  if (adapterInstance) return adapterInstance

  const apiKey = LLM_CONFIG.apiKey
  if (!apiKey) {
    throw new Error(`API key not found for provider: ${LLM_CONFIG.provider}`)
  }

  switch (LLM_CONFIG.provider) {
    case 'claude':
      adapterInstance = new ClaudeAdapter(apiKey)
      break
    case 'aliyun':
      adapterInstance = new AliyunAdapter(apiKey)
      break
    case 'bytedance':
      adapterInstance = new BytedanceAdapter(apiKey)
      break
    case 'openai':
      adapterInstance = new OpenAICompatAdapter(apiKey)
      break
    default:
      throw new Error(`Unknown LLM provider: ${LLM_CONFIG.provider}`)
  }

  return adapterInstance
}

/**
 * 调用 LLM（这是核心接口，所有调用都通过这里）
 */
export async function callLLM(systemPrompt, userMessage) {
  const adapter = getLLMAdapter()
  return await adapter.call(systemPrompt, userMessage)
}

/**
 * 获取当前配置的模型名称
 */
export function getCurrentModel() {
  return getModelName()
}

/**
 * 获取当前使用的 provider
 */
export function getCurrentProvider() {
  return LLM_CONFIG.provider
}

export default { callLLM, getCurrentModel, getCurrentProvider }
