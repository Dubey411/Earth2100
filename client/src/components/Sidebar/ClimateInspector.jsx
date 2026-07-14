import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Share2, Bookmark, ChevronRight,
  ThermometerSun, CloudRain, Users, TriangleAlert,
  Flame, Wind, Droplets, Waves, MountainSnow,
  Snowflake, House, CloudFog, TreePalm, Sun, Fish,
  TrendingUp, MapPin,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { HOTSPOTS } from '../../data/hotspots.js'
import useClimateStore from '../../store/useClimateStore.js'

const ICON_MAP = {
  Flame, Wind, Droplets, Waves, ThermometerSun, MountainSnow,
  Snowflake, House, CloudFog, TreePalm, Sun, Fish, Users, TrendingUp,
}

function severityStyle(sev) {
  if (sev === 'Critical') return {
    border: 'border-red-500/60', bg: 'bg-red-500/15', text: 'text-red-400', glow: '#ff4159',
  }
  if (sev === 'High') return {
    border: 'border-orange-500/60', bg: 'bg-orange-500/15', text: 'text-orange-400', glow: '#ff7138',
  }
  return {
    border: 'border-amber-500/60', bg: 'bg-amber-500/15', text: 'text-amber-400', glow: '#ffb72b',
  }
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#080e1e]/96 border border-white/12 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400">{payload[0]?.payload?.year}</div>
      <div className="font-bold mt-0.5" style={{ color: '#ff4159' }}>
        +{payload[0]?.value}°C
      </div>
    </div>
  )
}

// Severity score progress arc (SVG)
function ScoreArc({ score, color }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle
        cx="34" cy="34" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}   // start from top
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="34" y="38" textAnchor="middle" fontSize="13" fontWeight="800"
            fill={color} fontFamily="Inter, sans-serif">
        {score}
      </text>
    </svg>
  )
}

export default function ClimateInspector() {
  const activeRegion   = useClimateStore((s) => s.activeRegion)
  const sidebarOpen    = useClimateStore((s) => s.sidebarOpen)
  const closeSidebar   = useClimateStore((s) => s.closeSidebar)
  const setActiveRegion = useClimateStore((s) => s.setActiveRegion)

  const region   = HOTSPOTS.find((h) => h.id === activeRegion)
  const sevStyle = region ? severityStyle(region.severity) : {}

  return (
    <>
      {/* ── Tab when closed ── */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            key="tab"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            onClick={() => activeRegion && setActiveRegion(activeRegion)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50
                       w-10 h-16 grid place-items-center rounded-l-2xl
                       bg-[#0b1220]/90 backdrop-blur-xl border border-r-0 border-white/10
                       text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            aria-label="Open climate inspector"
          >
            <ChevronRight size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && region && (
          <motion.aside
            key="sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed right-0 top-[68px] bottom-10 z-50 w-[420px]
                       bg-[#0b1220]/94 backdrop-blur-2xl
                       border-l border-white/10 shadow-2xl
                       overflow-y-auto custom-scroll"
          >
            {/* ── Sticky header ── */}
            <div className="sticky top-0 z-10 px-6 pt-5 pb-4
                            bg-[#0b1220]/98 backdrop-blur-xl border-b border-white/8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin size={11} className="text-slate-500" />
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                      {region.area}
                    </p>
                  </div>
                  <h1 className="text-3xl font-black text-white leading-none">
                    {region.icon} {region.name}
                  </h1>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button onClick={closeSidebar}
                    className="w-8 h-8 grid place-items-center rounded-xl bg-white/6
                               hover:bg-red-500/20 hover:border-red-500/40 border border-transparent
                               text-slate-400 hover:text-red-400 transition-all"
                    aria-label="Close">
                    <X size={15} />
                  </button>
                  <button className="w-8 h-8 grid place-items-center rounded-xl bg-white/6
                               hover:bg-white/12 border border-transparent
                               text-slate-400 hover:text-white transition-colors"
                    aria-label="Share">
                    <Share2 size={14} />
                  </button>
                  <button className="w-8 h-8 grid place-items-center rounded-xl bg-white/6
                               hover:bg-white/12 border border-transparent
                               text-slate-400 hover:text-amber-400 transition-colors"
                    aria-label="Bookmark">
                    <Bookmark size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 pb-8 space-y-5 mt-4">

              {/* ── Severity + Score ── */}
              <div className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border
                               ${sevStyle.border} ${sevStyle.bg}`}>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    Severity
                  </div>
                  <div className={`text-lg font-black uppercase tracking-wide ${sevStyle.text}`}>
                    {region.severity}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{region.event}</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ScoreArc score={region.score} color={sevStyle.glow} />
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Risk Score</span>
                </div>
              </div>

              {/* ── Key stats ── */}
              <section>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Key Statistics
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: ThermometerSun, label: 'Avg temp rise',  value: region.temp,      color: '#ff6748' },
                    { icon: CloudRain,      label: 'Rainfall change', value: region.rain,      color: '#18a8ff' },
                    { icon: Users,          label: 'People affected', value: region.people,    color: '#00e6a8' },
                    { icon: TriangleAlert,  label: 'Disasters (5yr)', value: region.disasters, color: '#ffb72b' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label}
                      className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl
                                 border border-white/8 bg-white/3 text-center">
                      <Icon size={18} style={{ color }} />
                      <span className="text-lg font-black text-white leading-none">{value}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Temperature Anomaly chart ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Temperature Anomaly (°C)
                  </h2>
                  <span className="text-sm font-black text-red-400">{region.temp}</span>
                </div>
                <div className="h-40 border border-white/8 rounded-xl overflow-hidden bg-white/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={region.chartData} margin={{ top: 10, right: 14, left: -24, bottom: 4 }}>
                      <defs>
                        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#ff4159" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="#ff4159" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={1.5} stroke="#ffb72b" strokeDasharray="4 3"
                        label={{ value: '1.5°C', fill: '#ffb72b', fontSize: 9, position: 'right' }} />
                      <Area
                        type="monotone"
                        dataKey="temp"
                        stroke="#ff4159"
                        strokeWidth={2.5}
                        fill="url(#tempGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#ff4159' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* ── Climate Issues grid ── */}
              <section>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Climate Issues
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {region.issues.map((issue) => {
                    const Icon = ICON_MAP[issue.icon]
                    return (
                      <div key={issue.text}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl
                                   border border-white/8 bg-white/3 text-center">
                        {Icon && <Icon size={18} style={{ color: issue.color }} />}
                        <span className="text-[11px] font-semibold text-white leading-tight">
                          {issue.label}
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          {issue.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* ── About ── */}
              <section>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Overview
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">{region.about}</p>
              </section>

              {/* ── Action buttons ── */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button className="flex items-center justify-center gap-2 h-10 rounded-xl
                                   border border-white/10 bg-white/5 hover:bg-white/10
                                   text-xs font-semibold text-slate-300 hover:text-white
                                   transition-all">
                  <Share2 size={13} />
                  Share Report
                </button>
                <button className="flex items-center justify-center gap-2 h-10 rounded-xl
                                   border border-cyan-400/30 bg-cyan-400/8 hover:bg-cyan-400/15
                                   text-xs font-semibold text-cyan-400 hover:text-cyan-300
                                   transition-all">
                  <TrendingUp size={13} />
                  View Projections
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
