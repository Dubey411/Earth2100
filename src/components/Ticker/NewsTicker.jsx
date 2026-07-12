import { useState, useEffect, useRef } from 'react'
import { NEWS_ITEMS } from '../../data/events.js'

// ─── RapidAPI Climate Change RealTime config ──────────────────────────────────
const RAPIDAPI_KEY  = 'e6baa125femsha6d2dec29eaaf2ap103742jsnc0068006213f'
const RAPIDAPI_HOST = 'climate-change-realtime.p.rapidapi.com'
// Try source-specific first, fall back to generic /news if 404
const API_URLS = [
  `https://${RAPIDAPI_HOST}/news/theguardian`,
  `https://${RAPIDAPI_HOST}/news/bbc-news`,
  `https://${RAPIDAPI_HOST}/news`,
]

// ─── Emoji mapping for live headlines ────────────────────────────────────────
function pickEmoji(title = '') {
  const t = title.toLowerCase()
  if (t.includes('flood') || t.includes('sea') || t.includes('ocean') || t.includes('rain'))     return '🌊'
  if (t.includes('fire') || t.includes('wildfire') || t.includes('blaze') || t.includes('burn')) return '🔥'
  if (t.includes('storm') || t.includes('hurricane') || t.includes('typhoon') || t.includes('cyclone')) return '🌀'
  if (t.includes('heat') || t.includes('temperature') || t.includes('warm') || t.includes('hot')) return '🌡'
  if (t.includes('ice') || t.includes('glacier') || t.includes('arctic') || t.includes('polar')) return '🧊'
  if (t.includes('drought') || t.includes('desert') || t.includes('arid'))                       return '🏜'
  if (t.includes('carbon') || t.includes('emission') || t.includes('co2') || t.includes('fossil')) return '💨'
  if (t.includes('solar') || t.includes('wind') || t.includes('renewable') || t.includes('energy')) return '⚡'
  if (t.includes('forest') || t.includes('tree') || t.includes('deforest') || t.includes('amazon')) return '🌿'
  if (t.includes('species') || t.includes('biodiver') || t.includes('wildlife') || t.includes('extinct')) return '🦋'
  if (t.includes('pollution') || t.includes('aqi') || t.includes('smog') || t.includes('air'))   return '🌫'
  if (t.includes('crisis') || t.includes('alert') || t.includes('warning') || t.includes('emergency')) return '🔴'
  return '🌍'
}

// ─── Colour for each emoji prefix ────────────────────────────────────────────
function itemColor(text = '') {
  if (text.startsWith('🔥')) return '#ff7138'
  if (text.startsWith('🌊')) return '#18a8ff'
  if (text.startsWith('⚡')) return '#ffb72b'
  if (text.startsWith('🌀')) return '#cc66ff'
  if (text.startsWith('🌡')) return '#ff6020'
  if (text.startsWith('🧊')) return '#00e8ff'
  if (text.startsWith('🌿')) return '#00e6a8'
  if (text.startsWith('🔴')) return '#ff4159'
  if (text.startsWith('🌋')) return '#ff3300'
  if (text.startsWith('🏜')) return '#c87020'
  if (text.startsWith('💨')) return '#aaccff'
  if (text.startsWith('🌫')) return '#bbaacc'
  if (text.startsWith('🦋')) return '#88ffcc'
  if (text.startsWith('🌍')) return '#7ab8ff'
  return '#9cabbe'
}

// ─── Format a single API article into a ticker string ────────────────────────
function formatArticle(article) {
  const title  = article.title || article.headline || article.text || ''
  const source = article.source || article.sectionName || 'Guardian'
  const emoji  = pickEmoji(title)
  const shortTitle = title.length > 90 ? title.slice(0, 87) + '…' : title
  return `${emoji} ${shortTitle} — ${source}`
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NewsTicker() {
  const [items, setItems]     = useState([...NEWS_ITEMS, ...NEWS_ITEMS, ...NEWS_ITEMS])
  const [status, setStatus]   = useState('loading')   // 'loading' | 'live' | 'cached'

  useEffect(() => {
    let cancelled = false

    async function fetchNews() {
      const headers = {
        'Content-Type':    'application/json',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key':  RAPIDAPI_KEY,
      }

      let raw = []
      let succeeded = false

      try {
        for (const url of API_URLS) {
          try {
            const res = await fetch(url, { method: 'GET', headers })
            if (!res.ok) {
              console.warn(`[NewsTicker] ${url} → HTTP ${res.status}, trying next…`)
              continue
            }
            const data = await res.json()
            raw = Array.isArray(data)
              ? data
              : data.articles ?? data.news ?? data.results ?? data.data ?? []
            if (raw.length) { succeeded = true; break }
          } catch (innerErr) {
            console.warn(`[NewsTicker] ${url} failed:`, innerErr.message)
          }
        }

        if (cancelled) return
        if (!succeeded || !raw.length) throw new Error('all endpoints exhausted')

        const formatted = raw.slice(0, 30).map(formatArticle).filter(Boolean)
        if (!formatted.length) throw new Error('no valid articles')

        setItems([...formatted, ...formatted, ...formatted])
        setStatus('live')
      } catch (err) {
        if (!cancelled) {
          console.warn('[NewsTicker] Live feed unavailable, using static fallback:', err.message)
          setStatus('cached')
        }
      }
    }

    fetchNews()
    return () => { cancelled = true }
  }, [])

  // Badge appearance
  const badgeLabel = status === 'live' ? 'Live' : status === 'cached' ? 'Cached' : 'Live'
  const badgeColor = status === 'cached' ? '#facc15' : '#4ade80'

  // Scale duration so ticker speed stays constant regardless of item count
  const durationS = Math.max(40, items.length * 2.4)

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 h-10 flex items-center
                 border-t border-white/8 bg-[#020611]/92 backdrop-blur-xl overflow-hidden"
      aria-label="Climate news ticker"
    >
      {/* ── Badge ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 shrink-0 border-r border-white/8 h-full"
        style={{ background: `${badgeColor}12` }}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: badgeColor }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: badgeColor }}
          />
        </span>
        <span
          className="text-[10px] font-black uppercase tracking-[0.2em]"
          style={{ color: badgeColor }}
        >
          {badgeLabel}
        </span>
      </div>

      {/* ── Scrolling strip ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        {/* Left fade */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10"
          style={{ background: 'linear-gradient(to right, #020611f0, transparent)' }}
        />
        {/* Right fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10"
          style={{ background: 'linear-gradient(to left, #020611f0, transparent)' }}
        />

        <div
          className="flex gap-10 whitespace-nowrap w-max"
          style={{ animation: `ticker ${durationS}s linear infinite` }}
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

      {/* ── Source attribution (only when live) ────────────────────────── */}
      {status === 'live' && (
        <div className="shrink-0 px-3 border-l border-white/8 h-full flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          <span className="text-[9px] uppercase tracking-widest text-slate-500">
            The Guardian
          </span>
        </div>
      )}
    </footer>
  )
}
