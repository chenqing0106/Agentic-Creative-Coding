/**
 * 调用阿里 text-embedding-v3 生成文本向量
 */
export async function embed(text) {
  const response = await fetch(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ALIYUN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-v3',
        input: text
      })
    }
  )

  const data = await response.json()
  if (!response.ok) throw new Error(`Embedding error: ${data.error?.message}`)
  return data.data[0].embedding // float[]
}
