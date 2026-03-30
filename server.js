import express from 'express'
import 'dotenv/config'
import { getCurrentProvider, getCurrentModel } from './src/llm/index.js'
import { build as buildIndex } from './src/rag/index.js'
import { runAgent } from './src/graph/index.js'

const app = express()
app.use(express.json())
app.use(express.static('public'))

// 主接口 — 所有请求都走 Agent Graph
// mode 会由 router 自动判断，前端也可以显示当前是哪个角色在回答
app.post('/generate', async (req, res) => {
  const { description, sketchCode, mode } = req.body
  if (!description) return res.status(400).json({ error: 'description is required' })

  try {
    const { mode: resolvedMode, result } = await runAgent(description, sketchCode || null, mode || null)
    res.json({ mode: resolvedMode, code: result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// 重新建立 RAG 索引（添加新 sketch 后调用）
app.post('/build-index', async (_req, res) => {
  try {
    const records = await buildIndex()
    res.json({ ok: true, count: records.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 调试接口：查看当前配置
app.get('/config', (req, res) => {
  res.json({
    provider: getCurrentProvider(),
    model: getCurrentModel()
  })
})

app.listen(3000, () => {
  console.log(`🚀 Running at http://localhost:3000`)
  console.log(`📍 LLM Provider: ${getCurrentProvider()}`)
  console.log(`🤖 Model: ${getCurrentModel()}`)
})
