import { useState, useRef, useCallback } from 'react'
import { ingestVideo, ingestPDF } from '../api'
import SourceCard from './SourceCard'

export default function SourcePanel({ sources, onAddSource, onUpdateSource, onRemoveSource }) {
  const [videoUrl, setVideoUrl] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleAddVideo = async () => {
    const url = videoUrl.trim()
    if (!url) return
    setVideoUrl('')

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
  }

  const handleFile = useCallback(
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

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      handleFile(e.dataTransfer.files[0])
    },
    [handleFile],
  )

  const readyCount = sources.filter((s) => s.status === 'ready').length

  return (
    <aside className="w-72 flex-shrink-0 bg-slate-800 border-r border-slate-700/60 flex flex-col">
      {/* Logo / header */}
      <div className="px-4 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold shadow">
            M
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-none">Multimodal RAG</h1>
            <p className="text-xs text-slate-400 mt-0.5">AI research assistant</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* YouTube */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            YouTube Video
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
              placeholder="Paste YouTube URL…"
              className="flex-1 min-w-0 bg-slate-700/70 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition"
            />
            <button
              onClick={handleAddVideo}
              disabled={!videoUrl.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
        </section>

        {/* PDF drop zone */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            PDF Document
          </p>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
            }`}
          >
            <div className="text-3xl mb-2">📄</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Drop a PDF here or{' '}
              <span className="text-indigo-400 font-medium">click to browse</span>
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </section>

        {/* Sources list */}
        {sources.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sources</p>
              {readyCount > 0 && (
                <span className="text-xs text-green-400 font-medium">{readyCount} ready</span>
              )}
            </div>
            <div className="space-y-2">
              {sources.map((source) => (
                <SourceCard key={source.id} source={source} onRemove={onRemoveSource} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700/60">
        <p className="text-xs text-slate-600 text-center">
          Groq · LangGraph · Pinecone
        </p>
      </div>
    </aside>
  )
}
