import { NEWS_ITEMS } from '../../data/events.js'

// Triplicate so the seamless loop works even on very wide screens
const items = [...NEWS_ITEMS, ...NEWS_ITEMS, ...NEWS_ITEMS]

// Colour-code prefixes
function itemColor(item) {
  if (item.startsWith('🔥')) return '#ff7138'
  if (item.startsWith('🌊')) return '#18a8ff'
  if (item.startsWith('⚡')) return '#ffb72b'
  if (item.startsWith('🌀')) return '#cc66ff'
  if (item.startsWith('🌡')) return '#ff6020'
  if (item.startsWith('🧊')) return '#00e8ff'
  if (item.startsWith('🌿')) return '#00e6a8'
  if (item.startsWith('🔴')) return '#ff4159'
  if (item.startsWith('🌋')) return '#ff3300'
  if (item.startsWith('🏜')) return '#c87020'
  return '#9cabbe'
}

export default function NewsTicker() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 h-10 flex items-center
                 border-t border-white/8 bg-[#020611]/92 backdrop-blur-xl overflow-hidden"
      aria-label="Climate news ticker"
    >
      {/* Live badge */}
      <div className="flex items-center gap-2 px-4 shrink-0 border-r border-white/8 h-full
                      bg-green-400/6">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full
                           bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400">
          Live
        </span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="flex gap-10 whitespace-nowrap w-max"
          style={{ animation: 'ticker 60s linear infinite' }}
        >
          {items.map((item, i) => (
            <span
              key={i}
              className="text-[11.5px] shrink-0 flex items-center gap-2"
              style={{ color: itemColor(item) }}
            >
              {item}
              <span className="text-slate-700 text-sm">·</span>
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}
