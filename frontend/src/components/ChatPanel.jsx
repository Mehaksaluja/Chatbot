import { useState, useRef, useEffect, useCallback } from 'react'
import { streamQuery } from '../api'
import { useSourceIngestion } from '../hooks/useSourceIngestion'
import Message from './Message'
import SourceChip from './SourceChip'
import AttachmentMenu from './AttachmentMenu'
import { ArrowUpIcon, StopIcon } from './Icons'

const YOUTUBE_RE = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?\S*v=|shorts\/)|youtu\.be\/)[\w-]{6,}\S*$/

const SUGGESTIONS = [
  'Summarize the key points',
  'What are the main topics covered?',
  'List the most important takeaways',
  'Explain the core ideas simply',
]

export default function ChatPanel({
  messages, sources,
  onSetMessages, onSetTitle, onAddSource, onUpdateSource, onRemoveSource,
}) {
  const [input, setInput]       = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [ytUrl, setYtUrl]       = useState('')
  const [ytOpen, setYtOpen]     = useState(false)
  const ytInputRef = useRef(null)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const abortRef    = useRef(null)
  const dragDepth   = useRef(0)

  const { addVideo, addPDF } = useSourceIngestion({ onAddSource, onUpdateSource })

  const readySources = sources.filter((s) => s.status === 'ready')
  const canSend = input.trim().length > 0 && !isLoading && readySources.length > 0

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [input])
  useEffect(() => () => abortRef.current?.abort(), [])

  // ── Core query runner ──────────────────────────────────────
  const runQuery = useCallback(async (query, prior) => {
    if (!query || isLoading || readySources.length === 0) return
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
        if (ev.type === 'token')     { acc += ev.content; patch({ content: acc }) }
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

  // ── Drag & drop ────────────────────────────────────────────
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

  const isEmpty = messages.length === 0
  const lastAsstId = [...messages].reverse().find((m) => m.role === 'assistant')?.id

  return (
    <main
      className="relative flex-1 min-w-0 flex flex-col bg-[#0f0f0f] overflow-hidden"
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >

      {/* ── Drag overlay ── */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0f0f0f]/80 backdrop-blur-sm">
          <div className="border border-dashed border-[#333] rounded-2xl px-16 py-12 text-center">
            <p className="text-[15px] font-medium text-[#ccc]">Drop PDF here</p>
            <p className="text-[13px] text-[#555] mt-1">It will be indexed automatically</p>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (

          /* ── Empty state ── */
          <div className="h-full flex flex-col items-center justify-center px-6 select-none">
            <div className="w-full max-w-md text-center">

              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-[#161616] border border-[#222] flex items-center justify-center mx-auto mb-6">
                <svg className="w-5 h-5 text-[#555]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>

              <h2 className="text-[22px] font-semibold text-[#e8e8e8] tracking-tight mb-2">
                What would you like to know?
              </h2>
              <p className="text-[14px] text-[#555] leading-relaxed mb-8">
                Add a PDF or YouTube video, then ask anything about it.
                <br />Answers come with exact page numbers and timestamps.
              </p>

              {readySources.length === 0 ? (
                /* Upload options */
                <div className="space-y-2">
                  <p className="text-[11px] text-[#333] font-medium uppercase tracking-widest mb-3">
                    Get started
                  </p>
                  <label className="flex items-center gap-4 p-4 rounded-xl border border-[#1e1e1e] hover:border-[#2a2a2a] hover:bg-[#141414] cursor-pointer transition-all group">
                    <div className="w-9 h-9 rounded-lg bg-[#161616] border border-[#222] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#5a9ef8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 12h6m-6 4h6M5 4h9l5 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 4v5h5"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-[13.5px] font-semibold text-[#ccc] group-hover:text-[#e8e8e8] transition-colors">Upload a PDF</p>
                      <p className="text-[12px] text-[#444] mt-0.5">Click to browse or drag & drop</p>
                    </div>
                    <input type="file" accept=".pdf" className="hidden"
                      onChange={(e) => { if (e.target.files[0]) addPDF(e.target.files[0]); e.target.value = '' }} />
                  </label>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#1a1a1a]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 bg-[#0f0f0f] text-[11px] text-[#333]">or</span>
                    </div>
                  </div>

                  {ytOpen ? (
                    <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setYtOpen(false); setYtUrl('') }}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#555] hover:text-[#aaa] transition-colors flex-shrink-0"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                          </svg>
                        </button>
                        <p className="text-[13px] font-semibold text-[#ccc]">YouTube Video</p>
                      </div>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff4444]/60">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/>
                          </svg>
                        </div>
                        <input
                          ref={ytInputRef}
                          type="text"
                          value={ytUrl}
                          onChange={(e) => setYtUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && ytUrl.trim()) { addVideo(ytUrl.trim()); setYtOpen(false); setYtUrl('') }
                            if (e.key === 'Escape') { setYtOpen(false); setYtUrl('') }
                          }}
                          placeholder="https://youtube.com/watch?v=…"
                          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-[#3a3a3a] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[#ddd] placeholder-[#333] focus:outline-none transition-colors"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => { if (ytUrl.trim()) { addVideo(ytUrl.trim()); setYtOpen(false); setYtUrl('') } }}
                        disabled={!ytUrl.trim()}
                        className="w-full py-2 rounded-lg text-[13px] font-semibold bg-white text-[#0f0f0f] hover:bg-[#e8e8e8] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                      >
                        Add Video
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setYtOpen(true); setTimeout(() => ytInputRef.current?.focus(), 40) }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#1e1e1e] hover:border-[#2a2a2a] hover:bg-[#141414] cursor-pointer transition-all group text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#161616] border border-[#222] flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-[#ff4444]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13.5px] font-semibold text-[#ccc] group-hover:text-[#e8e8e8] transition-colors">Add YouTube Video</p>
                        <p className="text-[12px] text-[#444] mt-0.5">Indexes the full transcript</p>
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                /* Suggestions when sources are ready */
                <div className="space-y-2 text-left">
                  <p className="text-[11px] text-[#333] font-medium uppercase tracking-widest mb-3 text-center">
                    Try asking
                  </p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => runQuery(s, messages)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-[#1e1e1e] hover:border-[#2a2a2a] hover:bg-[#141414] text-[13.5px] text-[#666] hover:text-[#bbb] transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        ) : (
          <div className="max-w-2xl mx-auto w-full px-5 py-8 space-y-7">
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

      {/* ── Input ── */}
      <div className="flex-shrink-0 px-4 pb-5 pt-2">
        <div className="max-w-2xl mx-auto">

          {/* Source chips */}
          {sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
              {sources.map((s) => (
                <SourceChip key={s.id} source={s} onRemove={onRemoveSource} />
              ))}
            </div>
          )}

          {/* Input box */}
          <div className="bg-[#161616] border border-[#232323] rounded-2xl transition-colors focus-within:border-[#303030]">

            {/* Textarea */}
            <div className="px-4 pt-3.5 pb-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                rows={1}
                placeholder={
                  readySources.length === 0
                    ? 'Add a source above to start chatting…'
                    : 'Ask a question…'
                }
                className="w-full bg-transparent text-[14px] text-[#e0e0e0] placeholder-[#333] focus:outline-none leading-relaxed"
              />
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 pt-2 pb-2.5 border-t border-[#1e1e1e]">
              <AttachmentMenu onAddVideo={addVideo} onAddPDF={addPDF} disabled={isLoading} />

              {isLoading ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium text-[#888] hover:text-[#ccc] bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] transition-all"
                >
                  <StopIcon className="w-3 h-3" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canSend}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white disabled:bg-[#1e1e1e] disabled:cursor-not-allowed"
                >
                  <ArrowUpIcon className={`w-4 h-4 ${canSend ? 'text-[#0f0f0f]' : 'text-[#333]'}`} />
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-[#2a2a2a] mt-2">
            Answers are grounded in your sources only
          </p>
        </div>
      </div>
    </main>
  )
}
