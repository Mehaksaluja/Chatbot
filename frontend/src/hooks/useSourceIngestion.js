import { useCallback } from 'react'
import { ingestVideo, ingestPDF } from '../api'

export function useSourceIngestion({ onAddSource, onUpdateSource }) {
  const addVideo = useCallback(
    async (url) => {
      const tempId = crypto.randomUUID()
      onAddSource({ id: tempId, type: 'video', name: url, status: 'ingesting', chunksIndexed: 0 })
      try {
        const result = await ingestVideo(url)
        onUpdateSource(tempId, {
          id: result.source_id,
          status: 'ready',
          chunksIndexed: result.chunks_indexed,
        })
      } catch (err) {
        onUpdateSource(tempId, { status: 'error', error: err.message })
      }
    },
    [onAddSource, onUpdateSource],
  )

  const addPDF = useCallback(
    async (file) => {
      if (!file || !file.name.toLowerCase().endsWith('.pdf')) return
      const tempId = crypto.randomUUID()
      onAddSource({ id: tempId, type: 'pdf', name: file.name, status: 'ingesting', chunksIndexed: 0 })
      try {
        const result = await ingestPDF(file)
        onUpdateSource(tempId, {
          id: result.source_id,
          status: 'ready',
          chunksIndexed: result.chunks_indexed,
        })
      } catch (err) {
        onUpdateSource(tempId, { status: 'error', error: err.message })
      }
    },
    [onAddSource, onUpdateSource],
  )

  return { addVideo, addPDF }
}
