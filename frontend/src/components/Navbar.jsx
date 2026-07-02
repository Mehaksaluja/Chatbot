import { PlusIcon, SidebarIcon } from './Icons'

export default function Navbar({ sidebarOpen, onToggleSidebar, onNewChat, chatTitle }) {
  return (
    <header className="h-[52px] flex-shrink-0 flex items-center px-3 gap-3 border-b border-line bg-bg">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#555] hover:text-[#ccc] hover:bg-raised transition-colors"
      >
        <SidebarIcon className="w-[15px] h-[15px]" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-bg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1 L9.8 6.2 L15 6.2 L10.8 9.4 L12.4 14.6 L8 11.4 L3.6 14.6 L5.2 9.4 L1 6.2 L6.2 6.2 Z"/>
          </svg>
        </div>
        <span className="text-[13.5px] font-semibold text-[#e8e8e8] tracking-tight leading-none">Lumina</span>
      </div>

      {/* Chat title */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-4">
        {chatTitle && chatTitle !== 'New chat' && (
          <span className="text-[13px] text-[#555] truncate max-w-sm">{chatTitle}</span>
        )}
      </div>

      {/* New chat */}
      <button
        onClick={onNewChat}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium text-[#999] hover:text-[#e8e8e8] border border-line hover:border-white/[0.14] hover:bg-raised transition-all"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        <span>New</span>
      </button>
    </header>
  )
}
