import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Activity, Zap } from 'lucide-react'
import { EVENTS } from '../../data/events.js'
import useClimateStore from '../../store/useClimateStore.js'

function StatusDot({ color }) {
  return (
    <span className="relative inline-flex shrink-0">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-60"
        style={{ background: color }}
      />
    </span>
  )
}

function EventCard({ ev, active, onToggle }) {
  return (
    <motion.button
      onClick={() => onToggle(ev.id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`
        w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-200
        ${active
          ? 'border-current/40 bg-current/8'
          : 'border-white/6 bg-white/3 hover:bg-white/6 hover:border-white/12'}
      `}
      style={active ? { color: ev.color } : {}}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{ev.icon}</span>
          <span className={`text-[13px] font-semibold ${active ? 'text-current' : 'text-slate-200'}`}>
            {ev.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusDot color={ev.statusColor} />
          <span className="text-[10px] font-bold" style={{ color: ev.statusColor }}>
            {ev.status}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-tight text-left">
        {ev.description}
      </p>
      {ev.probability && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <Zap size={10} style={{ color: ev.color }} />
          <span className="text-[10px] font-semibold" style={{ color: ev.color }}>
            Probability: {ev.probability}
          </span>
        </div>
      )}
      {/* Detail line on hover (shown always if active) */}
      {active && ev.detail && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 pt-2 border-t border-current/20 text-[10px] text-slate-400 leading-snug"
        >
          {ev.detail}
        </motion.div>
      )}
    </motion.button>
  )
}

// Count how many are status 'Active' or 'Critical'
const ALERT_COUNT = EVENTS.filter((e) =>
  e.status === 'Active' || e.status === 'Critical' || e.status === 'Elevated'
).length

export default function EarthEvents() {
  const eventsOpen   = useClimateStore((s) => s.eventsOpen)
  const toggle       = useClimateStore((s) => s.toggleEventsOpen)
  const activeEvents = useClimateStore((s) => s.activeEvents)
  const toggleEvent  = useClimateStore((s) => s.toggleEvent)

  return (
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="fixed top-[80px] right-4 z-50 w-[280px]"
    >
      {/* Header toggle */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl
                   bg-[#0b1220]/80 backdrop-blur-xl border border-white/10
                   hover:border-white/20 transition-all duration-200"
      >
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-green-400 shrink-0" />
          <span className="text-sm font-semibold text-white tracking-wide">Earth Events</span>
          <span className="text-[10px] font-bold bg-red-500/80 text-white px-1.5 py-0.5 rounded-full leading-none">
            {ALERT_COUNT}
          </span>
        </div>
        <div className="text-slate-400">
          {eventsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* Collapsible event list */}
      <AnimatePresence>
        {eventsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden mt-2"
          >
            <div className="flex flex-col gap-1.5 max-h-[72vh] overflow-y-auto custom-scroll
                            rounded-2xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 p-2">
              {/* Section label */}
              <div className="px-1 pt-1 pb-0.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  Active Monitoring
                </span>
              </div>
              {EVENTS.map((ev) => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  active={activeEvents.has(ev.id)}
                  onToggle={toggleEvent}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
