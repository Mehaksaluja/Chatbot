import { useState, useRef, useEffect } from 'react'
import { PaperclipIcon } from './Icons'

const YoutubeIco = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/>
  </svg>
)

const PdfIco = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12h6m-6 4h6M5 4h9l5 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 4v5h5"/>
  </svg>
)

export default function AttachmentMenu({ onAddVideo, onAddPDF, disabled }) {
  const [open, setOpen]     = useState(false)
  const [mode, setMode]     = useState(null)   // null | 'video'
  const [url, setUrl]       = useState('')
  const menuRef  = useRef(null)
  const fileRef  = useRef(null)
  const urlRef   = useRef(null)

  useEffect(() => { if (!open) { setMode(null); setUrl('') } }, [open])
  useEffect(() => { if (mode === 'video') setTimeout(() => urlRef.current?.focus(), 60) }, [mode])

  useEffect(() => {
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const submit = () => { if (url.trim()) { onAddVideo(url.trim()); setOpen(false) } }

  return (
    <div ref={menuRef} className="relative flex-shrink-0">

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
          open ? 'bg-[#252525] text-[#ccc]' : 'text-[#444] hover:text-[#999] hover:bg-[#1e1e1e] disabled:opacity-30 disabled:cursor-not-allowed'
        }`}
      >
        <PaperclipIcon className="w-4 h-4" />
      </button>

      {/* Menu */}
      {open && (
        <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[300px] rounded-2xl border border-[#2a2a2a] bg-[#171717] shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden fade-in">

          {mode === null ? (
            <>
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-[#222]">
                <p className="text-[11px] font-semibold text-[#444] uppercase tracking-[0.1em]">Add a source</p>
                <p className="text-[12.5px] text-[#666] mt-0.5">Choose what to attach to this chat</p>
              </div>

              {/* Options */}
              <div className="p-2 space-y-1">

                {/* YouTube */}
                <button
                  onClick={() => setMode('video')}
                  className="group w-full flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-[#1e1e1e] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 text-[#ff4444] group-hover:border-[#ff4444]/30 group-hover:bg-[#200] transition-colors">
                    <YoutubeIco />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-[#d4d4d4] leading-tight">YouTube Video</p>
                    <p className="text-[12px] text-[#555] mt-0.5 leading-tight">Index transcript and ask questions</p>
                  </div>
                  <svg className="w-4 h-4 text-[#333] group-hover:text-[#555] ml-auto flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </button>

                {/* PDF */}
                <button
                  onClick={() => { fileRef.current?.click(); setOpen(false) }}
                  className="group w-full flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-[#1e1e1e] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 text-[#5a9ef8] group-hover:border-[#5a9ef8]/30 group-hover:bg-[#001533]/30 transition-colors">
                    <PdfIco />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-[#d4d4d4] leading-tight">PDF Document</p>
                    <p className="text-[12px] text-[#555] mt-0.5 leading-tight">Upload from your device or drag & drop</p>
                  </div>
                  <svg className="w-4 h-4 text-[#333] group-hover:text-[#555] ml-auto flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>

              {/* Footer note */}
              <div className="px-4 pb-3 pt-1">
                <p className="text-[11.5px] text-[#333]">Answers will be grounded strictly in the attached sources.</p>
              </div>
            </>
          ) : (
            /* YouTube URL input view */
            <>
              <div className="px-4 pt-4 pb-3 border-b border-[#222] flex items-center gap-2.5">
                <button
                  onClick={() => setMode(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[#666] hover:text-[#aaa] transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <div>
                  <p className="text-[13px] font-semibold text-[#d4d4d4] leading-tight">YouTube Video</p>
                  <p className="text-[11.5px] text-[#555]">Paste the video link below</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff4444]/60">
                    <YoutubeIco />
                  </div>
                  <input
                    ref={urlRef}
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="https://youtube.com/watch?v=…"
                    className="w-full bg-[#111] border border-[#2a2a2a] focus:border-[#3a3a3a] rounded-xl pl-10 pr-3 py-2.5 text-[13px] text-[#ddd] placeholder-[#333] focus:outline-none transition-colors"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={!url.trim()}
                  className="w-full py-2.5 rounded-xl text-[13.5px] font-semibold bg-white text-[#0f0f0f] hover:bg-[#e8e8e8] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                >
                  Add Video
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept=".pdf" className="hidden"
        onChange={(e) => { if (e.target.files[0]) onAddPDF(e.target.files[0]); e.target.value = '' }} />
    </div>
  )
}
