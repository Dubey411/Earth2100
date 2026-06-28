import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Globe2, Search, Bell, Moon, Layers, ChevronDown } from 'lucide-react'

function UtcClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(
        now.toUTCString().replace('GMT', 'UTC').split(' ').slice(1, 5).join(' ')
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono
                     text-slate-500 border border-white/6 rounded-lg px-2.5 py-1
                     bg-white/3 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      {time}
    </span>
  )
}

export default function Topbar() {
  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center gap-5 px-5
                 bg-[#020611]/82 backdrop-blur-2xl border-b border-white/8"
    >
      {/* Brand */}
      <a href="#" className="flex items-center gap-3 shrink-0" aria-label="Climate Lens home">
        <div className="w-11 h-11 grid place-items-center rounded-[14px] border border-cyan-400/50
                        bg-cyan-400/8 shadow-[0_0_24px_rgba(0,234,255,0.18)]">
          <Globe2 size={22} className="text-cyan-400" />
        </div>
        <div>
          <div className="font-black text-[16px] tracking-wider uppercase leading-none text-white">
            Climate Lens
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 leading-none tracking-wide">
            Earth Intelligence Platform
          </div>
        </div>
      </a>

      {/* Search */}
      <div className="flex-1 max-w-lg mx-auto">
        <label className="flex items-center gap-3 h-9 px-4 rounded-xl
                          border border-white/10 bg-white/4 backdrop-blur-sm
                          focus-within:border-cyan-400/40 focus-within:bg-white/6
                          transition-all duration-200">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="search"
            placeholder="Search region, signal, or climate event…"
            className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-300
                       placeholder:text-slate-500 min-w-0"
          />
        </label>
      </div>

      {/* UTC Clock */}
      <UtcClock />

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button className="relative w-9 h-9 grid place-items-center rounded-xl
                           text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
                aria-label="Notifications">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-[#020611]" />
        </button>
        <button className="w-9 h-9 grid place-items-center rounded-xl
                           text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
                aria-label="Toggle theme">
          <Moon size={16} />
        </button>
        <button className="w-9 h-9 grid place-items-center rounded-xl
                           text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
                aria-label="Layers">
          <Layers size={16} />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl
                           hover:bg-white/8 transition-colors"
                aria-label="Profile">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80"
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                             bg-green-400 border-2 border-[#020611]" />
          </div>
          <ChevronDown size={13} className="text-slate-400" />
        </button>
      </div>
    </motion.header>
  )
}
