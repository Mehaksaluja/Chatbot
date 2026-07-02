import { useState, useRef, useEffect } from 'react'
import { TrashIcon, PencilIcon } from './Icons'

function groupByDate(chats) {
  const now       = new Date()
  const today     = now.toDateString()
  const yesterday = new Date(now - 86400000).toDateString()
  const groups    = { Today: [], Yesterday: [], Earlier: [] }
  for (const c of chats) {
    const d = new Date(c.createdAt).toDateString()
    if (d === today)          groups.Today.push(c)
    else if (d === yesterday) groups.Yesterday.push(c)
    else                      groups.Earlier.push(c)
  }
  return groups
}

function ChatRow({ chat, isActive, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(chat.title)
  const ref = useRef(null)

  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select() } }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft.trim() && draft.trim() !== chat.title) onRename(draft)
    else setDraft(chat.title)
  }

  if (editing) {
    return (
      <div className="px-2 py-1">
        <input
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(chat.title); setEditing(false) }
          }}
          className="w-full bg-white/[0.06] rounded-lg px-2.5 py-1.5 text-[13px] text-[#e0e0e0] border border-white/[0.1] focus:outline-none"
        />
      </div>
    )
  }

  return (
    <button
      onClick={onSelect}
      onDoubleClick={() => setEditing(true)}
      className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] transition-all relative ${
        isActive
          ? 'bg-white/[0.06] text-[#d8d8d8]'
          : 'text-[#4a4a4a] hover:bg-white/[0.03] hover:text-[#999]'
      }`}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      <span className="flex-1 truncate font-[450] leading-snug">{chat.title}</span>

      {/* Hover actions */}
      <span className="absolute right-2 hidden group-hover:flex items-center gap-0.5 bg-[#111] rounded-lg px-0.5">
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); setEditing(true) }}
          className="p-1 rounded text-[#333] hover:text-[#888] transition-colors"
        >
          <PencilIcon className="w-3 h-3" />
        </span>
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded text-[#333] hover:text-red-400/80 transition-colors"
        >
          <TrashIcon className="w-3 h-3" />
        </span>
      </span>
    </button>
  )
}

export default function Sidebar({ open, chats, activeChatId, onSelectChat, onDeleteChat, onRenameChat }) {
  const groups = groupByDate(chats)

  return (
    <aside
      className="flex-shrink-0 bg-[#0f0f0f] border-r border-white/[0.05] flex flex-col overflow-hidden transition-[width] duration-200 ease-out"
      style={{ width: open ? 260 : 0 }}
    >
      <div className="w-[260px] h-full flex flex-col">

        {/* Chat list */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {Object.entries(groups).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label}>
                <p className="text-[10.5px] font-semibold text-[#2a2a2a] uppercase tracking-[0.12em] px-3 mb-1.5">
                  {label}
                </p>
                <div className="space-y-px">
                  {items.map((c) => (
                    <ChatRow
                      key={c.id}
                      chat={c}
                      isActive={c.id === activeChatId}
                      onSelect={() => onSelectChat(c.id)}
                      onDelete={() => onDeleteChat(c.id)}
                      onRename={(t) => onRenameChat(c.id, t)}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/[0.04]">
          <p className="text-[11px] text-[#252525] font-medium">Lumina AI · v2.0</p>
        </div>
      </div>
    </aside>
  )
}
