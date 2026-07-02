import { useState } from 'react'

export default function SourceChip({ source, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const isVideo = source.type === 'video'

  const label = isVideo
    ? source.name.replace(/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/, '').slice(0, 20)
    : source.name.replace(/\.pdf$/i, '').slice(0, 24)

  // ── Error state: expanded card showing exact reason ────────
  if (source.status === 'error') {
    return (
      <div className="inline-flex flex-col rounded-xl border border-[#3a1f1f] bg-[#1a1010] overflow-hidden max-w-xs">
        {/* Top row */}
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Warning icon */}
          <svg className="w-3.5 h-3.5 text-[#c0392b] flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
          </svg>

          <span className="text-[12.5px] font-medium text-[#c0392b] truncate flex-1">{label}</span>

          {/* Toggle details */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[11px] text-[#7a3030] hover:text-[#c0392b] transition-colors flex-shrink-0 underline underline-offset-2"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>

          {/* Dismiss */}
          <button
            onClick={() => onRemove(source.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-[#5a2020] hover:text-[#c0392b] hover:bg-white/5 transition-all flex-shrink-0"
          >
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor">
              <path d="M2 2l6 6M8 2L2 8" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Error detail */}
        {expanded && source.error && (
          <div className="border-t border-[#3a1f1f] px-3 py-2 bg-[#150d0d]">
            <p className="text-[12px] text-[#a05050] leading-relaxed">{source.error}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Ingesting state ────────────────────────────────────────
  if (source.status === 'ingesting') {
    return (
      <span className="inline-flex items-center gap-2 h-7 pl-2.5 pr-3 rounded-lg border border-[#2a2510] bg-[#1a1808] text-[12px] text-[#7a6a30]">
        <span className="relative w-2 h-2 flex-shrink-0">
          <span className="absolute inset-0 rounded-full bg-[#7a6a30] animate-ping opacity-60" />
          <span className="absolute inset-0 rounded-full bg-[#7a6a30]" />
        </span>
        <span className="font-medium">{label}</span>
        <span className="text-[#4a4020]">· indexing…</span>
      </span>
    )
  }

  // ── Ready state ────────────────────────────────────────────
  return (
    <span className="group inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg border border-[#232323] bg-[#161616] text-[12px] text-[#777] hover:text-[#bbb] hover:border-[#2e2e2e] transition-colors">
      {isVideo ? (
        <svg className="w-2.5 h-2.5 text-[#555]" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm-1 10V5l5 3-5 3z"/>
        </svg>
      ) : (
        <svg className="w-2.5 h-2.5 text-[#555]" viewBox="0 0 16 16" fill="none" stroke="currentColor">
          <path strokeWidth="1.2" strokeLinecap="round" d="M4 4h8M4 7h8M4 10h5"/>
          <rect x="2" y="1.5" width="12" height="13" rx="1.5" strokeWidth="1.2"/>
        </svg>
      )}
      <span className="font-[450]">{label}</span>
      <button
        onClick={() => onRemove(source.id)}
        className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all text-current"
      >
        <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none" stroke="currentColor">
          <path d="M2 2l6 6M8 2L2 8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </span>
  )
}
