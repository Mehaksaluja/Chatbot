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
    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap gap-1.5">
      {citations.map((c, i) =>
        c.source_type === 'video' ? (
          <span key={i} className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-[#2a2a2a] bg-[#161616] text-[11.5px] text-[#666]">
            <svg className="w-2.5 h-2.5 text-[#ff4444]/70" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm-1 10V5l5 3-5 3z"/>
            </svg>
            {c.ref}
          </span>
        ) : (
          <span key={i} className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-[#2a2a2a] bg-[#161616] text-[11.5px] text-[#666]">
            <svg className="w-2.5 h-2.5 text-[#5a9ef8]/70" viewBox="0 0 16 16" fill="none" stroke="currentColor">
              <path strokeWidth="1.2" strokeLinecap="round" d="M4 4h8M4 7h8M4 10h5"/>
              <rect x="2" y="1.5" width="12" height="13" rx="1.5" strokeWidth="1.2"/>
            </svg>
            p. {c.ref}
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
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    catch { /* ignore */ }
  }

  // ── User bubble ──────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end msg-in">
        <p className="max-w-[72%] bg-[#222222] text-[#e8e8e8] rounded-2xl rounded-br-sm px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap font-[450]">
          {message.content}
        </p>
      </div>
    )
  }

  // ── AI response ──────────────────────────────────────────
  return (
    <div className="flex gap-3 msg-in group">
      {/* Avatar */}
      <div className="w-6 h-6 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-0.5">
        <svg className="w-3 h-3 text-[#0f0f0f]" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1 L9.8 6.2 L15 6.2 L10.8 9.4 L12.4 14.6 L8 11.4 L3.6 14.6 L5.2 9.4 L1 6.2 L6.2 6.2 Z"/>
        </svg>
      </div>

      <div className="flex-1 min-w-0 pb-1">
        {/* Error state */}
        {message.error ? (
          <p className="text-[13.5px] text-[#e57373] leading-relaxed">{message.content}</p>
        ) : isPending ? (
          /* Loading dots */
          <div className="flex items-center gap-1 mt-1.5">
            {[0,140,280].map((d) => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#333] animate-bounce"
                style={{ animationDelay: `${d}ms` }} />
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

            {/* Actions — visible on hover */}
            {!message.streaming && (
              <div className="flex items-center gap-0.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={copy}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-[#444] hover:text-[#aaa] hover:bg-raised transition-all">
                  {copied
                    ? <><CheckIcon className="w-3.5 h-3.5 text-[#6a9955]" /><span className="text-[#6a9955]">Copied</span></>
                    : <><CopyIcon className="w-3.5 h-3.5" /><span>Copy</span></>}
                </button>

                {isLast && onRegenerate && (
                  <button onClick={onRegenerate} disabled={isLoading}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-[#444] hover:text-[#aaa] hover:bg-raised transition-all disabled:opacity-30">
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
