import { useState, useEffect, useRef } from 'react'
import { NEWS_ITEMS } from '../../data/events.js'

// ─── FREE RSS-to-JSON proxy (no API key needed) ──────────────────────────────
const RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url='

// ─── Climate news RSS sources ──────────────────────────────────────────────────
const RSS_SOURCES = [
  {
    url: 'https://www.theguardian.com/environment/climate-crisis/rss',
    label: 'The Guardian'
  },
  {
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    label: 'BBC News'
  },
  {
    url: 'https://www.reutersagency.com/feed/?best-topics=climate&post_type=best',
    label: 'Reuters'
  },
  {
    url: 'https://www.climate.gov/feeds/climate-case-studies.xml',
    label: 'NOAA Climate'
  },
  {
    url: 'https://www.nasa.gov/rss/dyn/earth.rss',
    label: 'NASA Earth'
  }
]

// ─── Static fallback (always works) ──────────────────────────────────────────
const FALLBACK_NEWS = [
  '🌍 Climate Action Summit 2024: Global leaders pledge $100B for renewable energy',
  '🧊 Arctic sea ice reaches record low for September, scientists warn of tipping point',
  '🌲 Amazon deforestation down 30% in 2024, Brazil reports best numbers in a decade',
  '🌊 El Niño strengthening: Pacific ocean temperatures rise 0.5°C above average',
  '🔥 Europe heatwave: 40°C temperatures break records across 12 countries',
  '⚡ Solar storm triggers aurora visible across northern US and Canada',
  '🌿 New Zealand commits to 100% renewable energy by 2030',
  '🧊 Antarctic ice shelf collapse: 500 sq km breaks away from Brunt Ice Shelf',
  '💨 Carbon emissions from fossil fuels hit record high in 2024, IEA reports',
  '🌊 Flood warnings issued for 12 countries in South Asia as monsoon intensifies',
  '🌀 Typhoon Mawar strengthens to Category 5, threatens Philippines',
  '🌡️ Global temperatures in 2024 surpass 1.5°C Paris Agreement limit',
  '🔴 UN Secretary-General declares "climate crisis is now an emergency"',
  '🌫️ Delhi air quality plummets to "severe" category as AQI crosses 400',
  '🌊 Venice installs flood barriers as sea level rise threatens historic city',
  '🔥 Canada wildfire season breaks records with 15 million hectares burned',
  '⚡ Tesla announces world\'s largest battery storage project in Texas',
  '🌿 Costa Rica achieves 98% renewable energy for third consecutive year',
  '🧊 Greenland ice sheet losing ice 7 times faster than in 1990s',
  '🌊 Miami invests $5 billion in sea wall protection against rising seas',
  '🌀 Hurricane Beryl leaves trail of destruction across Caribbean islands',
  '🌡️ Phoenix records 31 consecutive days above 110°F, breaking heat record',
  '💨 China launches world\'s largest carbon trading market',
  '🌲 Indonesia extends moratorium on new palm oil plantations',
  '⚡ India targets 500 GW renewable energy capacity by 2030',
  '🌊 Pacific Ocean acidification accelerating at unprecedented rate',
  '🔥 Greece battles wildfires as temperatures soar to 45°C',
  '🌿 EU passes landmark law to restore 20% of degraded ecosystems by 2030'
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

// ─── Fetch from a single RSS source ──────────────────────────────────────────
async function fetchRSSSource(source) {
  try {
    const response = await fetch(`${RSS_PROXY}${encodeURIComponent(source.url)}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (data.status === 'ok' && data.items?.length) {
      return data.items.map(item => ({
        title: item.title,
        source: source.label,
        pubDate: item.pubDate,
        description: item.description?.replace(/<[^>]*>/g, '').slice(0, 200) || ''
      }))
    }
    return []
  } catch (error) {
    console.warn(`[NewsTicker] Failed to fetch from ${source.label}:`, error.message)
    return []
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NewsTicker() {
  const [items, setItems] = useState([...FALLBACK_NEWS, ...FALLBACK_NEWS, ...FALLBACK_NEWS])
  const [status, setStatus] = useState('loading') // 'loading' | 'live' | 'cached'

  useEffect(() => {
    let cancelled = false

    async function fetchNews() {
      try {
        // Try all sources in parallel
        const results = await Promise.allSettled(
          RSS_SOURCES.map(source => fetchRSSSource(source))
        )

        if (cancelled) return

        // Collect all successful items
        let allItems = []
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.length) {
            allItems = [...allItems, ...result.value]
          }
        })

        // Sort by date (newest first)
        allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))

        // Remove duplicates (by title)
        const seen = new Set()
        const uniqueItems = allItems.filter(item => {
          const key = item.title.slice(0, 80)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

        if (!cancelled) {
          if (uniqueItems.length === 0) {
            console.warn('[NewsTicker] No news fetched, using fallback')
            setStatus('cached')
            return
          }

          const formatted = uniqueItems.slice(0, 30).map(item => {
            const emoji = pickEmoji(item.title)
            const shortTitle = item.title.length > 90 ? item.title.slice(0, 87) + '…' : item.title
            return `${emoji} ${shortTitle} — ${item.source}`
          })

          setItems([...formatted, ...formatted, ...formatted])
          setStatus('live')
          console.log(`[NewsTicker] ✅ Fetched ${formatted.length} live articles`)
        }

      } catch (err) {
        if (!cancelled) {
          console.warn('[NewsTicker] Live feed unavailable, using static fallback:', err.message)
          setStatus('cached')
        }
      }
    }

    fetchNews()

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      if (!cancelled) fetchNews()
    }, 5 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Badge appearance
  const badgeLabel = status === 'live' ? 'Live' : status === 'cached' ? 'Cached' : 'Live'
  const badgeColor = status === 'cached' ? '#facc15' : '#4ade80'

  // Scale duration so ticker speed stays constant
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

      {/* ── Source attribution ────────────────────────────────────────── */}
      {status === 'live' && (
        <div className="shrink-0 px-3 border-l border-white/8 h-full flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          <span className="text-[9px] uppercase tracking-widest text-slate-500">
            Climate News
          </span>
        </div>
      )}
    </footer>
  )
}