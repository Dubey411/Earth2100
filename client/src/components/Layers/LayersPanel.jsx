import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, X, Eye, EyeOff, Sparkles, Moon, Globe2, Flame,
} from "lucide-react";
import useClimateStore from "../../store/useClimateStore";

// ── Layer config ────────────────────────────────────────────────────────────
const LAYERS_CONFIG = [
  {
    id: "nightLights",
    title: "Night Lights",
    description: "City light emission mapping on the Earth's shadow side.",
    icon: Moon,
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
  },
  {
    id: "atmosphere",
    title: "Atmospheric Glow",
    description: "Thermosphere neon gas envelope around the planet.",
    icon: Sparkles,
    color: "text-cyan-400",
    bg: "bg-cyan-500/8",
    border: "border-cyan-500/20",
  },
  {
    id: "earthCore",
    title: "Earth's Interior",
    description: "Cutaway view showing Crust, Mantle, Outer Core & Inner Core.",
    icon: Globe2,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
  },
];

// ── Earth Core info cards ───────────────────────────────────────────────────
const CORE_LAYERS = [
  {
    name: "Inner Core",
    depth: "~1,270 km radius",
    desc: "Solid iron & nickel — extremely hot (~5,400 °C).",
    color: "#fffec8",
    text: "text-yellow-200",
    border: "border-yellow-300/30",
    bg: "bg-yellow-400/10",
  },
  {
    name: "Outer Core",
    depth: "~2,200 km thick",
    desc: "Liquid iron & nickel — generates Earth's magnetic field.",
    color: "#ff851b",
    text: "text-orange-300",
    border: "border-orange-400/30",
    bg: "bg-orange-400/10",
  },
  {
    name: "Mantle",
    depth: "~2,900 km deep",
    desc: "Semi-solid hot rock that flows very slowly over millions of years.",
    color: "#ff4136",
    text: "text-red-300",
    border: "border-red-400/30",
    bg: "bg-red-400/10",
  },
  {
    name: "Crust",
    depth: "0 – 35 km",
    desc: "The thin outer layer where we live. Oceanic & continental types.",
    color: "#5c3a21",
    text: "text-amber-200",
    border: "border-amber-700/30",
    bg: "bg-amber-900/20",
  },
];

export default function LayersPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { layersVisibility, toggleLayer } = useClimateStore();
  const panelRef = useRef(null);

  const earthCoreActive = !!layersVisibility?.earthCore;

  // Close panel on click outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-9 h-9 grid place-items-center rounded-xl transition-all cursor-pointer ${
          isOpen
            ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
            : "text-slate-400 hover:text-white hover:bg-white/8"
        }`}
        aria-label="Toggle Layers Panel"
        id="layers-panel-toggle"
      >
        <Layers size={16} />
      </button>

      {/* ── Dropdown Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10
                       bg-slate-950/94 shadow-2xl backdrop-blur-2xl z-[60] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/6">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Globe Overlays
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Layer Rows */}
            <div className="p-3 space-y-2">
              {LAYERS_CONFIG.map((layer) => {
                const isVisible = layersVisibility[layer.id] !== false;
                const Icon = layer.icon;
                const isEarthCore = layer.id === "earthCore";

                return (
                  <div key={layer.id}>
                    <div
                      onClick={() => toggleLayer(layer.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group
                        ${isEarthCore && isVisible
                          ? "border-orange-500/30 bg-orange-500/6"
                          : "border-white/4 hover:border-white/10 hover:bg-white/3"}`}
                    >
                      {/* Icon */}
                      <div className={`w-7 h-7 rounded-lg grid place-items-center border ${layer.bg} ${layer.border} shrink-0`}>
                        <Icon size={13} className={layer.color} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 leading-tight">
                          {layer.title}
                          {isEarthCore && isVisible && (
                            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 border border-orange-500/25 px-1.5 py-0.5 rounded-full">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                          {layer.description}
                        </div>
                      </div>

                      {/* Eye toggle */}
                      <div className={`shrink-0 transition-colors ${isVisible ? layer.color : "text-slate-600 group-hover:text-slate-400"}`}>
                        {isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                      </div>
                    </div>

                    {/* Earth Core Education Cards */}
                    <AnimatePresence>
                      {isEarthCore && isVisible && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 pl-1 pr-1 space-y-1.5 pb-1">
                            <p className="text-[10px] text-slate-500 px-1 pb-0.5 flex items-center gap-1.5">
                              <Flame size={10} className="text-orange-400" />
                              What's inside our planet?
                            </p>
                            {CORE_LAYERS.map((cl) => (
                              <div
                                key={cl.name}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border ${cl.border} ${cl.bg}`}
                              >
                                <div
                                  className="w-3 h-3 rounded-full shrink-0 mt-0.5 border border-white/20 shadow-lg"
                                  style={{ backgroundColor: cl.color }}
                                />
                                <div className="min-w-0">
                                  <div className={`text-[11px] font-bold ${cl.text} leading-none`}>
                                    {cl.name}
                                    <span className="font-normal text-slate-500 ml-1.5 text-[9px]">{cl.depth}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                    {cl.desc}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
