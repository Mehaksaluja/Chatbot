import { useState, useRef, useEffect, useCallback } from 'react'
import { streamQuery } from '../api'
import { useSourceIngestion } from '../hooks/useSourceIngestion'
import Message from './Message'
import SourceChip from './SourceChip'
import AttachmentMenu from './AttachmentMenu'
import { ArrowUpIcon, StopIcon } from './Icons'

const YOUTUBE_RE = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?\S*v=|shorts\/)|youtu\.be\/)[\w-]{6,}\S*$/

const GENERAL_SUGGESTIONS = [
  'Explain quantum computing simply',
  'Help me brainstorm startup ideas',
  'Write a professional email for me',
  'What are you capable of?',
]

const SOURCE_SUGGESTIONS = [
  'Summarize the key points',
  'What are the main topics?',
  'List the most important takeaways',
  'Explain the core ideas simply',
]

export default function ChatPanel({
  messages, sources,
  onSetMessages, onSetTitle, onAddSource, onUpdateSource, onRemoveSource,
}) {
  const [input, setInput]         = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [ytUrl, setYtUrl]         = useState('')
  const [ytOpen, setYtOpen]       = useState(false)
  const ytInputRef  = useRef(null)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const abortRef    = useRef(null)
  const dragDepth   = useRef(0)

  const { addVideo, addPDF } = useSourceIngestion({ onAddSource, onUpdateSource })

  const readySources = sources.filter((s) => s.status === 'ready')
  const canSend = input.trim().length > 0 && !isLoading

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])
  useEffect(() => () => abortRef.current?.abort(), [])

  // ── Core query runner ────────────────────────────────────────
  const runQuery = useCallback(async (query, prior) => {
    if (!query || isLoading) return
    setIsLoading(true)

    const userMsg = { id: crypto.randomUUID(), role: 'user', content: query }
    const asstId  = crypto.randomUUID()
    const asstMsg = { id: asstId, role: 'assistant', content: null, streaming: true, citations: [] }

    if (prior.length === 0) onSetTitle(query.slice(0, 52))
    onSetMessages([...prior, userMsg, asstMsg])

    const patch = (upd) =>
      onSetMessages((prev) =>
        prev.map((m) => m.id === asstId
          ? { ...m, ...(typeof upd === 'function' ? upd(m) : upd) }
          : m))

    const history = prior
      .filter((m) => m.content && !m.error)
      .slice(-12)
      .map(({ role, content }) => ({ role, content }))

    const ctrl = new AbortController()
    abortRef.current = ctrl
    let acc = ''

    try {
      for await (const ev of streamQuery(query, readySources.map((s) => s.id), history, ctrl.signal)) {
        if (ev.type === 'token')          { acc += ev.content; patch({ content: acc }) }
        else if (ev.type === 'answer')    { acc = ev.content; patch({ content: acc }) }
        else if (ev.type === 'citations') patch({ citations: ev.citations })
        else if (ev.type === 'error')     throw new Error(ev.message)
      }
      patch({ streaming: false, content: acc || 'No answer was generated.' })
    } catch (err) {
      if (err.name === 'AbortError') patch({ streaming: false, content: acc || '' })
      else patch({ streaming: false, content: `Something went wrong: ${err.message}`, error: true })
    } finally {
      abortRef.current = null
      setIsLoading(false)
    }
  }, [isLoading, readySources, onSetMessages, onSetTitle])

  const handleSubmit = useCallback(() => {
    const q = input.trim()
    if (!q) return
    setInput('')
    runQuery(q, messages)
  }, [input, messages, runQuery])

  const handleRegenerate = useCallback(() => {
    const idx = messages.findLastIndex((m) => m.role === 'user')
    if (idx === -1) return
    runQuery(messages[idx].content, messages.slice(0, idx))
  }, [messages, runQuery])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text')?.trim()
    if (text && YOUTUBE_RE.test(text)) { e.preventDefault(); addVideo(text) }
  }

  // ── Drag & drop ──────────────────────────────────────────────
  const onDragEnter = (e) => {
    e.preventDefault()
    dragDepth.current += 1
    if (e.dataTransfer?.types?.includes('Files')) setIsDragging(true)
  }
  const onDragLeave = (e) => {
    e.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }
  const onDrop = (e) => {
    e.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    Array.from(e.dataTransfer?.files || [])
      .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
      .forEach((f) => addPDF(f))
  }

  const isEmpty     = messages.length === 0
  const lastAsstId  = [...messages].reverse().find((m) => m.role === 'assistant')?.id
  const suggestions = readySources.length > 0 ? SOURCE_SUGGESTIONS : GENERAL_SUGGESTIONS

  return (
    <main
      className="relative flex-1 min-w-0 flex flex-col bg-[#0a0a0a] overflow-hidden"
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* ── Drag overlay ── */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="border-2 border-dashed border-white/20 rounded-3xl px-20 py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <p className="text-[15px] font-medium text-white/70">Drop your PDF here</p>
            <p className="text-[13px] text-white/30 mt-1">It will be indexed automatically</p>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        {isEmpty ? (

          /* ── Empty / welcome state ── */
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-[560px] text-center">

              {/* Icon */}
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center mx-auto mb-6">
                <svg className="w-4.5 h-4.5 text-[#0a0a0a]" viewBox="0 0 20 20" fill="currentColor" style={{width:18,height:18}}>
                  <path d="M10 1L12.09 7.26L18.5 7.26L13.46 11.19L15.5 17.45L10 13.5L4.5 17.45L6.54 11.19L1.5 7.26L7.91 7.26Z"/>
                </svg>
              </div>

              <h1 className="text-[26px] font-semibold text-[#f0f0f0] tracking-tight leading-tight mb-3">
                What can I help you with?
              </h1>
              <p className="text-[14px] text-[#4a4a4a] leading-relaxed mb-10">
                Chat freely about anything, or attach a PDF or YouTube video<br />
                to get AI answers grounded in your content.
              </p>

              {/* Suggestion grid */}
              <div className="grid grid-cols-2 gap-2 text-left">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => runQuery(s, messages)}
                    className="group flex items-start gap-2.5 px-4 py-3.5 rounded-2xl border border-white/[0.06] hover:border-white/[0.11] hover:bg-white/[0.03] text-[13.5px] text-[#555] hover:text-[#bbb] transition-all text-left leading-snug"
                  >
                    <span className="mt-0.5 opacity-40 group-hover:opacity-70 transition-opacity flex-shrink-0 text-[16px] leading-none">→</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

        ) : (

          /* ── Chat messages ── */
          <div className="max-w-[720px] mx-auto w-full px-6 py-10 space-y-8">
            {messages.map((msg) => (
              <Message
                key={msg.id}
                message={msg}
                isLast={msg.id === lastAsstId}
                onRegenerate={handleRegenerate}
                isLoading={isLoading}
              />
            ))}
            <div ref={bottomRef} />
          </div>

        )}
      </div>

      {/* ── Input area ── */}
      <div className="flex-shrink-0 px-4 pb-6 pt-3">
        <div className="max-w-[720px] mx-auto">

          {/* Source chips */}
          {sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 px-0.5">
              {sources.map((s) => (
                <SourceChip key={s.id} source={s} onRemove={onRemoveSource} />
              ))}
            </div>
          )}

          {/* Input box */}
          <div className="relative bg-[#141414] border border-white/[0.07] rounded-2xl transition-all focus-within:border-white/[0.13] focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              placeholder={readySources.length > 0 ? 'Ask about your sources…' : 'Ask anything…'}
              className="w-full bg-transparent text-[14.5px] text-[#e8e8e8] placeholder-[#303030] focus:outline-none leading-relaxed px-4 pt-4 pb-3 min-h-[52px] max-h-[200px] resize-none"
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 pb-3">

              {/* Left: attachment */}
              <div className="flex items-center gap-1">
                <AttachmentMenu onAddVideo={addVideo} onAddPDF={addPDF} disabled={isLoading} />
                <span className="text-[11.5px] text-[#2a2a2a] ml-1 hidden sm:block">
                  {readySources.length > 0
                    ? `${readySources.length} source${readySources.length > 1 ? 's' : ''} attached`
                    : 'Attach PDF or YouTube'}
                </span>
              </div>

              {/* Right: stop / send */}
              {isLoading ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[12.5px] font-medium text-[#777] hover:text-[#ccc] bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] transition-all"
                >
                  <StopIcon className="w-3 h-3" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canSend}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    canSend
                      ? 'bg-white hover:bg-[#e8e8e8] shadow-sm'
                      : 'bg-white/[0.05] cursor-not-allowed'
                  }`}
                >
                  <ArrowUpIcon className={`w-4 h-4 ${canSend ? 'text-[#0a0a0a]' : 'text-[#303030]'}`} />
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-[#222] mt-2.5">
            Lumina may make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </main>
  )
}
