import { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import ChatPanel from './components/ChatPanel'

const STORAGE_KEY = 'lumina-chats-v2'

function createChat() {
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    messages: [],
    sources: [],
    createdAt: Date.now(),
  }
}

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const chats = JSON.parse(raw)
    if (!Array.isArray(chats) || chats.length === 0) return null
    return chats.map((c) => ({
      ...c,
      messages: (c.messages || []).filter((m) => m.content),
      sources: (c.sources || []).filter((s) => s.status === 'ready'),
    }))
  } catch {
    return null
  }
}

export default function App() {
  const [chats, setChats] = useState(() => loadChats() ?? [createChat()])
  const [activeChatId, setActiveChatId] = useState(() => chats?.[0]?.id)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const activeChat = chats.find((c) => c.id === activeChatId) ?? chats[0]

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
    } catch { /* storage unavailable */ }
  }, [chats])

  // ── Chat management ────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    const chat = createChat()
    setChats((prev) => [chat, ...prev])
    setActiveChatId(chat.id)
  }, [])

  const handleSelectChat = useCallback((id) => setActiveChatId(id), [])

  const handleDeleteChat = useCallback((id) => {
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== id)
      if (remaining.length === 0) {
        const fresh = createChat()
        setActiveChatId(fresh.id)
        return [fresh]
      }
      if (id === activeChatId) setActiveChatId(remaining[0].id)
      return remaining
    })
  }, [activeChatId])

  const handleRenameChat = useCallback((id, title) => {
    const trimmed = title.trim()
    if (!trimmed) return
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)))
  }, [])

  // ── Per-chat state helpers ─────────────────────────────────
  const patchChat = useCallback((updater) => {
    setChats((prev) => prev.map((c) => (c.id === activeChatId ? updater(c) : c)))
  }, [activeChatId])

  const onSetMessages = useCallback((updater) => {
    patchChat((c) => ({
      ...c,
      messages: typeof updater === 'function' ? updater(c.messages) : updater,
    }))
  }, [patchChat])

  const onSetTitle = useCallback((title) => {
    patchChat((c) => (c.title === 'New chat' ? { ...c, title } : c))
  }, [patchChat])

  const onAddSource    = useCallback((s)       => patchChat((c) => ({ ...c, sources: [...c.sources, s] })), [patchChat])
  const onUpdateSource = useCallback((id, upd) => patchChat((c) => ({ ...c, sources: c.sources.map((s) => s.id === id ? { ...s, ...upd } : s) })), [patchChat])
  const onRemoveSource = useCallback((id)      => patchChat((c) => ({ ...c, sources: c.sources.filter((s) => s.id !== id) })), [patchChat])

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">
      <Navbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onNewChat={handleNewChat}
        chatTitle={activeChat.title}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
        />

        <ChatPanel
          key={activeChatId}
          messages={activeChat.messages}
          sources={activeChat.sources}
          onSetMessages={onSetMessages}
          onSetTitle={onSetTitle}
          onAddSource={onAddSource}
          onUpdateSource={onUpdateSource}
          onRemoveSource={onRemoveSource}
        />
      </div>
    </div>
  )
}
