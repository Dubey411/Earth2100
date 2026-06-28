import { motion, AnimatePresence } from 'framer-motion'
import { GripHorizontal } from 'lucide-react'
import useClimateStore from '../../store/useClimateStore.js'

const SCENARIOS = [
  {
    id: 'stable',
    label: 'Stabilized Earth',
    sub: 'Paris targets achieved',
    temp: '+1.5°C',
    emoji: '🟢',
    color: '#00e6a8',
    milestones: [
      { year: 2035, text: 'Renewables supply 70% of global electricity' },
      { year: 2050, text: 'Net zero emissions reached globally' },
      { year: 2070, text: 'Arctic sea ice stabilizes in winter' },
      { year: 2100, text: 'Sea level rise limited to 0.4 m' },
    ],
  },
  {
    id: 'adapt',
    label: 'Adaptation Gap',
    sub: 'Partial mitigation',
    temp: '+2.4°C',
    emoji: '🟠',
    color: '#ffb72b',
    milestones: [
      { year: 2035, text: 'Longer fire seasons across Western US' },
      { year: 2050, text: 'Sea levels increase 0.3 – 0.5 m' },
      { year: 2070, text: 'Monsoon variability intensifies' },
      { year: 2100, text: 'Arctic summer sea ice declines sharply' },
    ],
  },
  {
    id: 'crisis',
    label: 'Cascading Crisis',
    sub: 'Current trajectory',
    temp: '+4.3°C',
    emoji: '🔴',
    color: '#ff4159',
    milestones: [
      { year: 2035, text: 'Frequent compound extreme events' },
      { year: 2050, text: 'Sea levels +0.7 m, coastal cities threatened' },
      { year: 2070, text: 'Extreme droughts across continents' },
      { year: 2100, text: 'Arctic summer sea ice disappears entirely' },
    ],
  },
]

const COMPOUND_RISKS = [
  { city: 'Mumbai',   country: 'India',     risk: 'Sea Rise + Storm Surge',  pop: '12M', area: '35 km²', color: '#ff4159' },
  { city: 'Jakarta',  country: 'Indonesia', risk: 'Subsidence + Flooding',   pop: '10M', area: '28 km²', color: '#ff6748' },
  { city: 'Miami',    country: 'USA',       risk: 'King Tide + Hurricane',   pop: '6M',  area: '18 km²', color: '#ffb72b' },
  { city: 'Dhaka',    country: 'Bangladesh',risk: 'Monsoon + Sea Level',     pop: '21M', area: '45 km²', color: '#ff5580' },
  { city: 'Shanghai', country: 'China',     risk: 'Typhoon + Tidal Surge',   pop: '24M', area: '60 km²', color: '#ff8844' },
  { city: 'Tokyo',    country: 'Japan',     risk: 'Tsunami + Sea Level',     pop: '8M',  area: '21 km²', color: '#ffb72b' },
]

export default function PlanetaryFutures() {
  const drawerOpen       = useClimateStore((s) => s.drawerOpen)
  const toggleDrawer     = useClimateStore((s) => s.toggleDrawer)
  const sliderYear       = useClimateStore((s) => s.sliderYear)
  const setSliderYear    = useClimateStore((s) => s.setSliderYear)
  const activeScenario   = useClimateStore((s) => s.activeScenario)
  const setActiveScenario = useClimateStore((s) => s.setActiveScenario)

  const scenario         = SCENARIOS.find((s) => s.id === activeScenario) || SCENARIOS[2]
  const milestones       = scenario.milestones

  const currentMilestone = milestones.reduce(
    (prev, curr) => (curr.year <= sliderYear ? curr : prev),
    milestones[0]
  )

  // Slider progress 0..1
  const sliderPct = ((sliderYear - 2025) / (2100 - 2025)) * 100

  return (
    <motion.div
      className="fixed bottom-10 left-[88px] right-0 z-40"
      style={{ height: 320 }}
    >
      <motion.div
        animate={{ y: drawerOpen ? 0 : 278 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="absolute inset-0 bg-[#080e1e]/96 backdrop-blur-xl border-t border-white/10"
      >
        {/* ── Handle ── */}
        <button
          onClick={toggleDrawer}
          className="w-full h-12 flex items-center justify-center gap-4 cursor-pointer
                     hover:bg-white/3 transition-colors group"
          aria-expanded={drawerOpen}
          aria-label="Toggle Planetary Futures drawer"
        >
          <span className="h-px flex-1 ml-6 bg-gradient-to-r from-transparent to-white/20 group-hover:to-white/35 transition-colors" />
          <div className="flex items-center gap-2.5 text-green-400">
            <GripHorizontal size={15} />
            <span className="text-[11px] font-black uppercase tracking-[0.22em]">Planetary Futures</span>
          </div>
          <span className="h-px flex-1 mr-6 bg-gradient-to-l from-transparent to-white/20 group-hover:to-white/35 transition-colors" />
        </button>

        {/* ── Content ── */}
        <div className="px-6 pb-3 overflow-hidden h-[calc(100%-48px)] flex flex-col gap-3">

          {/* Top row: timeline + scenario cards */}
          <div className="grid grid-cols-[260px_1fr_1fr_1fr] gap-4 flex-1 min-h-0">

            {/* Timeline slider + milestone card */}
            <div className="flex flex-col justify-between py-1 min-h-0">
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.18em] mb-2.5"
                    style={{ color: scenario.color }}>
                  Timeline Projection
                </h2>

                {/* Year markers */}
                <div className="flex justify-between text-[9px] text-slate-600 mb-1 px-0.5">
                  <span>2025</span>
                  <span>2050</span>
                  <span>2075</span>
                  <span>2100</span>
                </div>

                {/* Range slider */}
                <div className="relative mb-3">
                  <input
                    type="range" min="2025" max="2100" value={sliderYear}
                    onChange={(e) => setSliderYear(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right,
                        ${scenario.color} 0%,
                        ${scenario.color} ${sliderPct}%,
                        rgba(255,255,255,0.1) ${sliderPct}%,
                        rgba(255,255,255,0.1) 100%)`,
                      accentColor: scenario.color,
                    }}
                    aria-label="Timeline year slider"
                  />
                </div>

                <div className="text-5xl font-black leading-none" style={{ color: scenario.color }}>
                  {sliderYear}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMilestone.year + activeScenario}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="p-3 rounded-xl border border-white/8 bg-white/3"
                >
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    By {currentMilestone.year}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentMilestone.text}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Scenario cards */}
            {SCENARIOS.map((sc) => {
              const active = activeScenario === sc.id
              return (
                <motion.button
                  key={sc.id}
                  onClick={() => setActiveScenario(sc.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative h-full flex flex-col justify-between text-left p-4
                    rounded-2xl border transition-all duration-300 overflow-hidden
                    ${active
                      ? ''
                      : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5'}
                  `}
                  style={active ? {
                    borderColor: sc.color + '60',
                    background: sc.color + '12',
                    boxShadow: `0 0 32px ${sc.color}25`,
                  } : {}}
                >
                  {/* Top section */}
                  <div>
                    <div className={`text-[9px] font-black uppercase tracking-widest mb-2
                                     ${active ? '' : 'text-slate-500'}`}
                         style={active ? { color: sc.color } : {}}>
                      {sc.sub}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{sc.emoji}</span>
                      <div className={`text-[13px] font-bold leading-tight
                                       ${active ? '' : 'text-white'}`}
                           style={active ? { color: sc.color } : {}}>
                        {sc.label}
                      </div>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className={`text-4xl font-black mt-2 ${active ? '' : 'text-slate-400'}`}
                       style={active ? { color: sc.color } : {}}>
                    {sc.temp}
                  </div>

                  {/* Active glow ring */}
                  {active && (
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ boxShadow: `inset 0 0 24px ${sc.color}20` }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Bottom row: compound risk cities */}
          <div className="grid grid-cols-6 gap-2 shrink-0">
            {COMPOUND_RISKS.map((risk) => (
              <div
                key={risk.city}
                className="px-2.5 py-2 rounded-xl border border-white/8 bg-white/2
                           flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="text-[11px] font-semibold text-white truncate">{risk.city}</div>
                  <div className="text-[10px] font-bold shrink-0" style={{ color: risk.color }}>
                    {risk.pop}
                  </div>
                </div>
                <div className="text-[9px] text-slate-500 leading-tight">{risk.risk}</div>
                <div className="text-[9px] text-slate-600">{risk.area} at risk</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
