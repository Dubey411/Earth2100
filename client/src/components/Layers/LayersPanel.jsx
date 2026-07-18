import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, X, Eye, EyeOff, Sparkles, Moon, Sun, ShieldAlert } from "lucide-react";
import useClimateStore from "../../store/useClimateStore";

const LAYERS_CONFIG = [
  {
    id: "nightLights",
    title: "Night Lights",
    description: "City light emission mapping on the Earth's shadow side.",
    icon: Moon,
    color: "text-amber-400 bg-amber-500/8 border-amber-500/20",
  },
  {
    id: "atmosphere",
    title: "Atmospheric Glow",
    description: "Atmospheric neon gas thermosphere envelope.",
    icon: Sparkles,
    color: "text-cyan-400 bg-cyan-500/8 border-cyan-500/20",
  },
  {
    id: "heatmap",
    title: "Temperature Heatmap",
    description: "Procedural heat gradient shader representing warming hotspots.",
    icon: ShieldAlert,
    color: "text-red-400 bg-red-500/8 border-red-500/20",
  },
  {
    id: "satelliteTemp",
    title: "NASA Satellite Map",
    description: "Live daily land surface temp WMS maps pulled from NASA GIBS.",
    icon: Sun,
    color: "text-orange-400 bg-orange-500/8 border-orange-500/20",
  },
];

export default function LayersPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { layersVisibility, toggleLayer } = useClimateStore();
  const panelRef = useRef(null);

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
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-9 h-9 grid place-items-center rounded-xl transition-all cursor-pointer ${
          isOpen 
            ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" 
            : "text-slate-400 hover:text-white hover:bg-white/8"
        }`}
        aria-label="Toggle Layers Panel"
      >
        <Layers size={16} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10
                       bg-slate-950/92 shadow-2xl backdrop-blur-2xl z-[60] overflow-hidden p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/6 pb-2.5 mb-3">
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
            <div className="space-y-2.5">
              {LAYERS_CONFIG.map((layer) => {
                const isVisible = layersVisibility[layer.id] !== false;
                const Icon = layer.icon;

                return (
                  <div
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className="flex items-center gap-3 p-2 rounded-xl border border-white/4
                               hover:border-white/10 hover:bg-white/3 transition-all cursor-pointer group"
                  >
                    {/* Layer icon */}
                    <div className={`w-7 h-7 rounded-lg grid place-items-center border ${layer.color} shrink-0`}>
                      <Icon size={13} />
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 leading-tight">
                        {layer.title}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-normal mt-0.5 pr-2">
                        {layer.description}
                      </div>
                    </div>

                    {/* Checkbox Icon */}
                    <div className={`shrink-0 pr-1 ${isVisible ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-400'} transition-colors`}>
                      {isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </div>
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
