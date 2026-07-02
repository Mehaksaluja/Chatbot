import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CopyIcon, CheckIcon, RefreshIcon } from './Icons'

const mdComponents = {
  h1:         (p) => <h1 {...p} />,
  h2:         (p) => <h2 {...p} />,
  h3:         (p) => <h3 {...p} />,
  p:          (p) => <p {...p} />,
  ul:         (p) => <ul {...p} />,
  ol:         (p) => <ol {...p} />,
  li:         (p) => <li {...p} />,
  strong:     (p) => <strong {...p} />,
  em:         (p) => <em {...p} />,
  a:          (p) => <a target="_blank" rel="noreferrer" {...p} />,
  blockquote: (p) => <blockquote {...p} />,
  code: ({ inline, children, ...p }) =>
    inline
      ? <code {...p}>{children}</code>
      : <pre><code {...p}>{children}</code></pre>,
}

function Citations({ citations }) {
  if (!citations?.length) return null
  return (
    <div className="mt-4 pt-3 border-t border-white/[0.05] flex flex-wrap gap-1.5">
      {citations.map((c, i) =>
        c.source_type === 'video' ? (
          <span key={i} className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-white/[0.07] bg-white/[0.03] text-[11.5px] text-[#555] hover:text-[#888] transition-colors cursor-default">
            <svg className="w-2.5 h-2.5 text-red-500/60" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm-1 10V5l5 3-5 3z"/>
            </svg>
            {c.ref}
          </span>
        ) : (
          <span key={i} className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-white/[0.07] bg-white/[0.03] text-[11.5px] text-[#555] hover:text-[#888] transition-colors cursor-default">
            <svg className="w-2.5 h-2.5 text-blue-400/60" viewBox="0 0 16 16" fill="none" stroke="currentColor">
              <path strokeWidth="1.2" strokeLinecap="round" d="M4 4h8M4 7h8M4 10h5"/>
              <rect x="2" y="1.5" width="12" height="13" rx="1.5" strokeWidth="1.2"/>
            </svg>
            p.&nbsp;{c.ref}
          </span>
        )
      )}
    </div>
  )
}

export default function Message({ message, isLast, onRegenerate, isLoading }) {
  const [copied, setCopied] = useState(false)
  const isUser    = message.role === 'user'
  const isPending = message.content === null || message.content === ''

  const copy = async () => {
    if (!message.content) return
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  // ── User message ─────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end msg-in">
        <div className="max-w-[75%]">
          <p className="bg-[#1c1c1c] border border-white/[0.06] text-[#e0e0e0] rounded-2xl rounded-br-md px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // ── Assistant message ────────────────────────────────────────
  return (
    <div className="flex gap-3.5 msg-in group">

      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-0.5 shadow-sm">
        <svg viewBox="0 0 20 20" fill="currentColor" className="text-[#0a0a0a]" style={{width:12,height:12}}>
          <path d="M10 1L12.09 7.26L18.5 7.26L13.46 11.19L15.5 17.45L10 13.5L4.5 17.45L6.54 11.19L1.5 7.26L7.91 7.26Z"/>
        </svg>
      </div>

      <div className="flex-1 min-w-0 pt-0.5">

        {/* Error */}
        {message.error ? (
          <div className="flex items-start gap-2.5 text-[13.5px] text-[#e57373] leading-relaxed">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#e57373]/70" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
            {message.content}
          </div>

        ) : isPending ? (
          /* Loading dots */
          <div className="flex items-center gap-1.5 h-6">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="w-1.5 h-1.5 rounded-full bg-[#2e2e2e] animate-bounce"
                style={{ animationDelay: `${d}ms`, animationDuration: '1s' }}
              />
            ))}
          </div>

        ) : (
          /* Answer */
          <div>
            <div className="prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {message.content}
              </ReactMarkdown>
              {message.streaming && <span className="cursor" />}
            </div>

            {!message.streaming && <Citations citations={message.citations} />}

            {/* Action buttons */}
            {!message.streaming && (
              <div className="flex items-center gap-0.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] text-[#3a3a3a] hover:text-[#888] hover:bg-white/[0.04] transition-all"
                >
                  {copied
                    ? <><CheckIcon className="w-3.5 h-3.5 text-emerald-500/70" /><span className="text-emerald-500/70">Copied</span></>
                    : <><CopyIcon className="w-3.5 h-3.5" /><span>Copy</span></>
                  }
                </button>

                {isLast && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] text-[#3a3a3a] hover:text-[#888] hover:bg-white/[0.04] transition-all disabled:opacity-30"
                  >
                    <RefreshIcon className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
