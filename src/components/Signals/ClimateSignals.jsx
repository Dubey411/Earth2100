import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SIGNALS } from '../../data/signals.js'
import useClimateStore from '../../store/useClimateStore.js'

/* â”€â”€â”€ Per-signal palette swatches (matches EarthGlobe SIGNAL_HOTSPOT_DATA) â”€â”€ */
const SIGNAL_PALETTES = {
  heat:     ['#FFD54F', '#FFB300', '#FF8F00', '#FF5722', '#D32F2F'],
  flood:    ['#0066ff', '#3399ff', '#4da6ff'],
  wildfire: ['#ff2200', '#ff4500', '#ff6b35'],
  drought:  ['#a0522d', '#b5651d', '#cd853f'],
  cryo:     ['#00ffff', '#66ffff', '#aaffff'],
  air:      ['#8a2be2', '#9370db', '#b07edb'],
  forest:   ['#cc0000', '#ff0000', '#ff4444'],
  sealevel: ['#00bfff', '#00ffff', '#80ffff'],
  enso:     ['#ff5c00', '#ff8c00', '#ffb347', '#ffd700'],
  storm:    ['#cc66ff', '#dd88ff', '#eeb0ff'],
  solar:    ['#ffdd00', '#ffaa00', '#ff7700', '#ff3300'],
}

/* â”€â”€â”€ Hotspot counts per signal â”€â”€ */
const SIGNAL_HOTSPOT_COUNTS = {
  heat:     7,
  flood:    5,
  wildfire: 5,
  drought:  4,
  cryo:     3,
  air:      5,
  forest:   3,
  sealevel: 6,
  enso:     4,
  storm:    4,
  solar:    1,
}

/* â”€â”€â”€ Animation labels â”€â”€ */
const ANIM_LABELS = {
  heat:     'Thermal field · 8s',
  flood:    'Ripple Â· 2.2s',
  flood:    'Ripple · 2.2s',
  wildfire: 'Flicker · 0.4s',
  drought:  'Diffuse · slow',
  cryo:     'Breathe · 3.5s',
  air:      'Haze · drift',
  forest:   'Blink · 1.2s',
  sealevel: 'Coast edge',
  enso:     'Current · 2.8s',
  storm:    'Spin · 1.8s',
  solar:    'Aurora · wave',
}

// Collapsed signal button (left rail icon pill)
function SignalPill({ sig, active, onToggle, onExpand }) {
  return (
    <motion.button
      onClick={() => {
        onToggle(sig.id)
        if (!active) onExpand(sig.id)
        else onExpand(null)
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={sig.label}
      aria-label={sig.label}
      aria-pressed={active}
      className={`
        relative w-[68px] min-h-[68px] flex flex-col items-center justify-center gap-1.5
        rounded-[14px] border transition-all duration-200 text-center
        ${active
          ? 'border-current bg-current/10'
          : 'border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/15'}
      `}
      style={active ? { color: sig.color, boxShadow: `0 0 20px ${sig.color}50` } : {}}
    >
      <span className="text-[20px] leading-none">{sig.icon}</span>
      <span className={`text-[9px] font-medium leading-tight px-1
                        ${active ? 'text-current' : 'text-slate-400'}`}>
        {sig.label}
      </span>

      {/* Active hotspot count badge */}
      {active && sig.id !== 'heat' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black
                     flex items-center justify-center text-white"
          style={{ background: sig.color }}
        >
          {SIGNAL_HOTSPOT_COUNTS[sig.id] ?? '?'}
        </motion.span>
      )}

      {active && (
        <motion.div
          layoutId={`signal-glow-${sig.id}`}
          className="absolute inset-0 rounded-[14px] pointer-events-none"
          style={{ boxShadow: `inset 0 0 14px ${sig.color}30` }}
        />
      )}
    </motion.button>
  )
}

export default function ClimateSignals() {
  const activeSignals      = useClimateStore((s) => s.activeSignals)
  const toggleSignal       = useClimateStore((s) => s.toggleSignal)
  const signalIntensity    = useClimateStore((s) => s.signalIntensity)
  const setSignalIntensity = useClimateStore((s) => s.setSignalIntensity)

  const [expandedId, setExpandedId] = useState(null)

  const handleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const expandedSig = SIGNALS.find((s) => s.id === expandedId)
  const palette     = expandedSig ? (SIGNAL_PALETTES[expandedSig.id] || []) : []
  const intensity   = expandedSig ? (signalIntensity[expandedSig.id] ?? 1.0) : 1.0
  const hotspotCount = expandedSig ? (SIGNAL_HOTSPOT_COUNTS[expandedSig.id] ?? 0) : 0
  const animLabel   = expandedSig ? (ANIM_LABELS[expandedSig.id] ?? '') : ''

  return (
    <motion.nav
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      aria-label="Climate Signals"
      className="fixed left-0 top-[68px] bottom-10 z-40 w-[88px] flex flex-col items-center
                 gap-2 py-4 overflow-y-auto scrollbar-none
                 border-r border-white/6 bg-[#020611]/40 backdrop-blur-sm"
    >
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2 text-center">
        Signals
      </div>

      {SIGNALS.map((sig) => {
        const active = activeSignals.has(sig.id)
        return (
          <SignalPill
            key={sig.id}
            sig={sig}
            active={active}
            onToggle={toggleSignal}
            onExpand={handleExpand}
          />
        )
      })}

      {/* â”€â”€ Intensity panel â€” slides out to the right â”€â”€ */}
      <AnimatePresence>
        {expandedSig && activeSignals.has(expandedSig.id) && (
          <motion.div
            key={expandedSig.id}
            initial={{ opacity: 0, x: -16, scaleX: 0.88 }}
            animate={{ opacity: 1, x: 0, scaleX: 1 }}
            exit={{ opacity: 0, x: -16, scaleX: 0.88 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed left-[96px] z-50 w-[224px]
                       bg-[#080e1e]/95 backdrop-blur-2xl
                       border border-white/10 rounded-2xl shadow-2xl
                       p-4 flex flex-col gap-3"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              boxShadow: `0 0 48px ${expandedSig.color}18, 0 24px 64px rgba(0,0,0,0.7)`,
            }}
          >
            {/* â”€â”€ Header â”€â”€ */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-lg grid place-items-center text-base"
                  style={{ background: expandedSig.color + '20', border: `1px solid ${expandedSig.color}50` }}
                >
                  {expandedSig.icon}
                </span>
                <div>
                  <div className="text-xs font-black text-white leading-none">{expandedSig.label}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{animLabel}</div>
                </div>
              </div>
              <button
                onClick={() => setExpandedId(null)}
                className="text-slate-500 hover:text-white text-xs leading-none
                           w-5 h-5 grid place-items-center rounded-md hover:bg-white/10 transition-colors"
                aria-label="Close intensity panel"
              >
                âœ•
              </button>
            </div>

            {/* â”€â”€ Palette swatches â”€â”€ */}
            <div className="flex items-center gap-1.5">
              {palette.map((c) => (
                <div
                  key={c}
                  title={c}
                  className="flex-1 h-2 rounded-full"
                  style={{ background: c, boxShadow: `0 0 6px ${c}80` }}
                />
              ))}
            </div>

            {/* â”€â”€ Description â”€â”€ */}
            <p className="text-[10px] text-slate-400 leading-snug">
              {expandedSig.description}
            </p>

            {/* â”€â”€ Intensity slider â”€â”€ */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Intensity
                </span>
                <span className="text-[11px] font-black" style={{ color: expandedSig.color }}>
                  {Math.round(intensity * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={intensity}
                onChange={(e) => setSignalIntensity(expandedSig.id, Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right,
                    ${expandedSig.color} 0%,
                    ${expandedSig.color} ${intensity * 100}%,
                    rgba(255,255,255,0.08) ${intensity * 100}%,
                    rgba(255,255,255,0.08) 100%)`,
                  accentColor: expandedSig.color,
                }}
                aria-label={`${expandedSig.label} intensity`}
              />

              <div className="flex justify-between text-[9px] text-slate-600 -mt-0.5">
                <span>Present</span>
                <span>2050</span>
                <span>2100</span>
              </div>
            </div>

            {/* â”€â”€ Active hotspots status â”€â”€ */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-xl border text-[10px] font-semibold"
              style={{
                borderColor: expandedSig.color + '35',
                background:  expandedSig.color + '10',
                color:       expandedSig.color,
              }}
            >
              <div className="flex items-center gap-2">
                {expandedSig.id !== 'heat' && (
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: expandedSig.color }}
                  />
                )}
                <span>{hotspotCount} {expandedSig.id === 'heat' ? 'regions' : 'hotspots'} active</span>
              </div>
              <span className="text-[9px] opacity-60">globe</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
