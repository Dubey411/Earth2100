import { motion } from 'framer-motion'
import { Plus, Minus, RotateCcw, Hand } from 'lucide-react'
import useClimateStore from '../../store/useClimateStore.js'

const BTN = {
  rest:  { scale: 1 },
  hover: { scale: 1.05 },
  tap:   { scale: 0.95 },
}

function ControlBtn({ onClick, title, children, active, activeColor = '#22d3ee' }) {
  return (
    <motion.button
      variants={BTN}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`
        w-14 h-14 flex items-center justify-center rounded-2xl
        bg-[#0b1220]/80 backdrop-blur-xl border border-white/10
        text-white transition-all duration-200 shadow-xl
        hover:bg-[#0b1220]/95 hover:border-white/20
      `}
      style={active ? {
        borderColor: activeColor + '99',
        color: activeColor,
        background: activeColor + '20',
        boxShadow: `0 0 20px ${activeColor}30`,
      } : {}}
    >
      {children}
    </motion.button>
  )
}

// Subtle divider between button groups
function Divider() {
  return <div className="w-8 h-px bg-white/10 mx-auto" />
}

export default function GlobeControls() {
  const handToolActive   = useClimateStore((s) => s.handToolActive)
  const toggleHandTool   = useClimateStore((s) => s.toggleHandTool)
  const flyTo            = useClimateStore((s) => s.flyTo)

  const zoomIn   = () => flyTo(20, 70, 1.2)
  const zoomOut  = () => flyTo(20, 70, 3.0)
  const reset    = () => flyTo(20, 70, 2.2)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2, duration: 0.5 }}
      className="absolute left-[120px] top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3"
    >
      {/* ── Hand Tool ── */}
      <ControlBtn
        onClick={toggleHandTool}
        title={handToolActive ? 'Hand Tool — Active (click to disable)' : 'Hand Tool — Inactive (click to enable)'}
        active={handToolActive}
        activeColor="#22d3ee"
      >
        <Hand size={20} />
      </ControlBtn>

      <Divider />

      {/* ── Zoom In ── */}
      <ControlBtn onClick={zoomIn} title="Zoom In">
        <Plus size={20} />
      </ControlBtn>

      {/* ── Zoom Out ── */}
      <ControlBtn onClick={zoomOut} title="Zoom Out">
        <Minus size={20} />
      </ControlBtn>

      {/* ── Reset Camera ── */}
      <ControlBtn onClick={reset} title="Reset Camera">
        <RotateCcw size={20} />
      </ControlBtn>
    </motion.div>
  )
}
