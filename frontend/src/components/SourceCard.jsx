const STATUS = {
  ingesting: { dot: 'bg-amber-400 animate-pulse', label: 'Indexing…' },
  ready:     { dot: 'bg-green-400',               label: null },
  error:     { dot: 'bg-red-400',                 label: null },
}

export default function SourceCard({ source, onRemove }) {
  const isVideo = source.type === 'video'
  const cfg = STATUS[source.status] ?? STATUS.ingesting

  const displayName = isVideo
    ? source.name.replace(/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/, '')
    : source.name.replace(/\.pdf$/i, '')

  const statusLabel =
    source.status === 'ready'
      ? `${source.chunksIndexed} chunks indexed`
      : source.status === 'error'
      ? source.error || 'Failed'
      : cfg.label

  return (
    <div className="flex items-center gap-2.5 bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-2.5">
      <span className="text-base flex-shrink-0">{isVideo ? '🎬' : '📄'}</span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-200 truncate">{displayName}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span
            className={`text-xs truncate ${
              source.status === 'error' ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {source.status !== 'ingesting' && (
        <button
          onClick={() => onRemove(source.id)}
          className="flex-shrink-0 text-slate-600 hover:text-slate-300 text-xs leading-none transition-colors p-0.5"
          title="Remove source"
        >
          ✕
        </button>
      )}
    </div>
  )
}
