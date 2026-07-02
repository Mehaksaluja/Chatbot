function extractDetail(body, fallback) {
  if (!body.detail) return fallback
  // FastAPI 422 validation errors return detail as an array
  if (Array.isArray(body.detail)) {
    return body.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
  }
  return String(body.detail)
}

export async function ingestVideo(url) {
  const res = await fetch('/ingest/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractDetail(body, 'Failed to ingest video'))
  }
  return res.json()
}

export async function ingestPDF(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/ingest/pdf', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractDetail(body, 'Failed to ingest PDF'))
  }
  return res.json()
}

export async function* streamQuery(query, sourceIds, history = [], signal) {
  const res = await fetch('/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, source_ids: sourceIds, history }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Query failed')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()
      for (const part of parts) {
        if (part.startsWith('data: ')) {
          yield JSON.parse(part.slice(6))
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}
