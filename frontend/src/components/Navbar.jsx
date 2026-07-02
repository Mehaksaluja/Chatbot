import { PlusIcon, SidebarIcon } from './Icons'

export default function Navbar({ sidebarOpen, onToggleSidebar, onNewChat, chatTitle }) {
  return (
    <header className="h-[54px] flex-shrink-0 flex items-center px-3 border-b border-white/[0.05] bg-[#0a0a0a]">

      {/* Left: sidebar toggle + logo */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#3a3a3a] hover:text-[#888] hover:bg-white/[0.04] transition-all"
          aria-label="Toggle sidebar"
        >
          <SidebarIcon className="w-[15px] h-[15px]" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="text-[#0a0a0a]" style={{width:11,height:11}}>
              <path d="M10 1L12.09 7.26L18.5 7.26L13.46 11.19L15.5 17.45L10 13.5L4.5 17.45L6.54 11.19L1.5 7.26L7.91 7.26Z"/>
            </svg>
          </div>
          <span className="text-[14px] font-semibold text-[#e8e8e8] tracking-tight">Lumina</span>
        </div>
      </div>

      {/* Center: active chat title */}
      <div className="flex-1 flex items-center justify-center px-6 min-w-0">
        {chatTitle && chatTitle !== 'New chat' && (
          <span className="text-[13px] text-[#3a3a3a] truncate max-w-[400px]">{chatTitle}</span>
        )}
      </div>

      {/* Right: new chat */}
      <button
        onClick={onNewChat}
        className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[13px] font-medium text-[#555] hover:text-[#ddd] border border-white/[0.06] hover:border-white/[0.11] hover:bg-white/[0.04] transition-all"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        <span>New</span>
      </button>
    </header>
  )
}
