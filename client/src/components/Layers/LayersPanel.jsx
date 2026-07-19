import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, X, Eye, EyeOff, Sparkles, Moon, Globe2, Flame } from "lucide-react";
import useClimateStore from "../../store/useClimateStore";

// ── Independent toggle layers ────────────────────────────────────────────────
const TOGGLE_LAYERS = [
  {
    id: "nightLights",
    title: "Night Lights",
    description: "City light emission mapping on the Earth's shadow side.",
    icon: Moon,
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    activeBorder: "border-amber-400/40",
  },
  {
    id: "atmosphere",
    title: "Atmospheric Glow",
    description: "Thermosphere neon gas envelope around the planet.",
    icon: Sparkles,
    color: "text-cyan-400",
    bg: "bg-cyan-500/8",
    border: "border-cyan-500/20",
    activeBorder: "border-cyan-400/40",
  },
];

// ── Radio-style exclusive layers ─────────────────────────────────────────────
const RADIO_LAYERS = [
  {
    id: "earthCore",
    title: "Earth's Interior",
    description: "Cutaway cross-section: Crust → Mantle → Outer Core → Inner Core.",
    icon: Globe2,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    activeBorder: "border-orange-400/50",
    activeBg: "bg-orange-500/8",
  },
];

// ── Earth Core education cards ───────────────────────────────────────────────
const CORE_LAYERS = [
  { name: "Inner Core",  depth: "~1,270 km radius",  desc: "Solid iron & nickel — ~5,400 °C.",                         color: "#fffec8", text: "text-yellow-200", border: "border-yellow-300/25", bg: "bg-yellow-400/8"  },
  { name: "Outer Core",  depth: "~2,200 km thick",   desc: "Liquid iron & nickel — creates Earth's magnetic field.",   color: "#ff851b", text: "text-orange-300", border: "border-orange-400/25", bg: "bg-orange-400/8" },
  { name: "Mantle",      depth: "~2,900 km deep",    desc: "Semi-solid hot rock that flows slowly over millions of years.", color: "#ff4136", text: "text-red-300",    border: "border-red-400/25",    bg: "bg-red-400/8"    },
  { name: "Crust",       depth: "0 – 35 km",         desc: "Thin outer layer where we live. Oceanic & continental.",   color: "#7a4e2d", text: "text-amber-200", border: "border-amber-700/25", bg: "bg-amber-900/15" },
];

export default function LayersPanel() {
  const [isOpen, setIsOpen]   = useState(false);
  const { layersVisibility, toggleLayer, activeLayer, setActiveLayer } = useClimateStore();
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={panelRef}>

      {/* ── Trigger ── */}
      <button
        id="layers-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Layers Panel"
        className={`w-9 h-9 grid place-items-center rounded-xl transition-all cursor-pointer
          ${isOpen
            ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
            : "text-slate-400 hover:text-white hover:bg-white/8"}`}
      >
        <Layers size={16} />
      </button>

      {/* ── Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10
                       bg-slate-950/94 shadow-2xl backdrop-blur-2xl z-[60] overflow-hidden
                       max-h-[calc(100vh-110px)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/6 shrink-0">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Globe Overlays</span>
              </div>
              <button onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-white/8 hover:text-white transition-colors cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">

              {/* ── Section: Independent Toggles ── */}
              <div>
                <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold px-1 mb-1.5">
                  Visual Overlays
                </p>
                <div className="space-y-1.5">
                  {TOGGLE_LAYERS.map((layer) => {
                    const isOn = layersVisibility[layer.id] !== false;
                    const Icon = layer.icon;
                    return (
                      <div
                        key={layer.id}
                        onClick={() => toggleLayer(layer.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer
                          transition-all group
                          ${isOn ? layer.activeBorder + " bg-white/2" : "border-white/4 hover:border-white/10 hover:bg-white/2"}`}
                      >
                        <div className={`w-7 h-7 rounded-lg grid place-items-center border shrink-0 ${layer.bg} ${layer.border}`}>
                          <Icon size={13} className={layer.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-200">{layer.title}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{layer.description}</div>
                        </div>
                        <div className={`shrink-0 transition-colors ${isOn ? layer.color : "text-slate-600 group-hover:text-slate-400"}`}>
                          {isOn ? <Eye size={14} /> : <EyeOff size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/5" />

              {/* ── Section: Radio Layers ── */}
              <div>
                <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold px-1 mb-1.5">
                  Exclusive Modes — Click to activate / deactivate
                </p>
                <div className="space-y-1.5">
                  {RADIO_LAYERS.map((layer) => {
                    const isOn = activeLayer === layer.id;
                    const Icon = layer.icon;
                    return (
                      <div key={layer.id}>
                        <div
                          onClick={() => setActiveLayer(layer.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all
                            ${isOn
                              ? `${layer.activeBorder} ${layer.activeBg}`
                              : "border-white/4 hover:border-white/10 hover:bg-white/2"}`}
                        >
                          <div className={`w-7 h-7 rounded-lg grid place-items-center border shrink-0 ${layer.bg} ${layer.border}`}>
                            <Icon size={13} className={layer.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-200">{layer.title}</span>
                              {isOn && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5
                                               rounded-full bg-orange-500/15 border border-orange-400/25 text-orange-400">
                                  ON
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{layer.description}</div>
                          </div>
                          {/* Radio circle indicator */}
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all flex items-center justify-center
                            ${isOn ? "border-orange-400 bg-orange-400" : "border-slate-600"}`}>
                            {isOn && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                        </div>

                        {/* Education cards expand when active */}
                        <AnimatePresence>
                          {isOn && layer.id === "earthCore" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 ml-1 mr-1 space-y-1.5 pb-1">
                                <p className="text-[10px] text-slate-500 px-1 pb-0.5 flex items-center gap-1.5">
                                  <Flame size={10} className="text-orange-400" />
                                  What's inside our planet?
                                </p>
                                {CORE_LAYERS.map((cl) => (
                                  <div key={cl.name}
                                    className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg border ${cl.border} ${cl.bg}`}>
                                    <div className="w-3 h-3 rounded-full shrink-0 mt-0.5 border border-white/20"
                                      style={{ backgroundColor: cl.color }} />
                                    <div className="min-w-0">
                                      <div className={`text-[11px] font-bold ${cl.text} leading-none`}>
                                        {cl.name}
                                        <span className="font-normal text-slate-500 ml-1.5 text-[9px]">{cl.depth}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{cl.desc}</div>
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
