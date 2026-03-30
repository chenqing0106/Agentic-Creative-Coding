/**
 * LLM 配置管理
 * 通过切换 LLM_PROVIDER 环境变量，可以无缝切换不同的大厂 API
 */

export const LLM_CONFIG = {
  // 当前使用的 provider: 'claude' | 'aliyun' | 'bytedance'
  provider: process.env.LLM_PROVIDER || 'claude',

  // API 密钥
  apiKey: process.env[`${process.env.LLM_PROVIDER?.toUpperCase() || 'ANTHROPIC'}_API_KEY`],

  // 模型选择
  models: {
    claude: 'claude-sonnet-4-6',
    aliyun: 'qwen-plus',            // Tool Use 需要 plus 以上，turbo 不支持
    bytedance: 'doubao-pro-128k',   // 字节豆包
    openai: 'gpt-4'                 // 通用 OpenAI 兼容接口
  },

  // 端点配置
  endpoints: {
    claude: 'https://api.anthropic.com/v1/messages',
    aliyun: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    bytedance: 'https://ark.cn-beijing.volces.com/api/v3/messages',
    openai: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  }
}

export const getModelName = () => {
  return LLM_CONFIG.models[LLM_CONFIG.provider]
}

export const getEndpoint = () => {
  return LLM_CONFIG.endpoints[LLM_CONFIG.provider]
}
