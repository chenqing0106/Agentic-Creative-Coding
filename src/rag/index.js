/**
 * RAG 主模块
 *
 * build()  — 读取 public/sketches/ 里的所有 .js 文件，向量化后存入 data/sketch-vectors.json
 * query()  — 给定 prompt，找出最相似的 sketch 代码，返回用于注入 system prompt 的 context 字符串
 */
import fs from 'fs/promises'
import path from 'path'
import { embed } from './embeddings.js'
import { loadStore, saveStore, search } from './store.js'

const SKETCHES_DIR = './public/sketches'

export async function build() {
  const files = (await fs.readdir(SKETCHES_DIR)).filter(f => f.endsWith('.js'))
  console.log(`Building RAG index from ${files.length} sketches...`)

  const records = []
  for (const file of files) {
    const code = await fs.readFile(path.join(SKETCHES_DIR, file), 'utf-8')

    // 读取 meta 文件（如果有）
    let meta = {}
    try {
      const metaRaw = await fs.readFile(
        path.join(SKETCHES_DIR, file.replace('.js', '.meta.json')),
        'utf-8'
      )
      meta = JSON.parse(metaRaw)
    } catch {
      // 没有 meta 文件，跳过
    }

    // 向量化时用 style_notes + mood 而不是原始代码，语义更强
    const textToEmbed = meta.style_notes
      ? `${meta.style_notes} ${meta.mood || ''} ${meta.why_i_like_it || ''}`
      : code

    const vector = await embed(textToEmbed)
    records.push({ file, code, meta, vector })
    console.log(`  ✓ ${file}`)
  }

  await saveStore(records)
  console.log(`Index saved to data/sketch-vectors.json`)
  return records
}

export async function query(prompt) {
  const records = await loadStore()
  if (records.length === 0) return ''

  const queryVector = await embed(prompt)
  const matches = search(queryVector, records, 2)

  // 注入风格描述（比原始代码更易被模型理解）
  const context = matches.map(m => {
    const meta = m.meta || {}
    const lines = [`Reference: ${m.file}`]
    if (meta.style_notes) lines.push(`Style: ${meta.style_notes}`)
    if (meta.mood)        lines.push(`Mood: ${meta.mood}`)
    if (meta.palette)     lines.push(`Palette: ${meta.palette}`)
    if (meta.motion)      lines.push(`Motion: ${meta.motion}`)
    if (meta.why_i_like_it) lines.push(`Why: ${meta.why_i_like_it}`)
    return lines.join('\n')
  }).join('\n\n---\n\n')

  return context
}
