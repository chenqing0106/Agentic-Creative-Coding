/**
 * 本地 JSON 向量存储
 * 每条记录: { file, code, vector }
 */
import fs from 'fs/promises'
import path from 'path'

const STORE_PATH = './data/sketch-vectors.json'

export async function loadStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function saveStore(records) {
  await fs.writeFile(STORE_PATH, JSON.stringify(records, null, 2))
}

// 余弦相似度
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
  return dot / (normA * normB)
}

// 找最相似的 topK 个 sketch
export function search(queryVector, records, topK = 2) {
  return records
    .map(r => ({ ...r, score: cosineSimilarity(queryVector, r.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
