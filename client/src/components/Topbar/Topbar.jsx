import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe2, Search, Moon, ChevronDown, LogOut, LogIn, User } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import AuthModal from "../Auth/AuthModal";
import NotificationPanel from "../Notifications/NotificationPanel";
import LayersPanel from "../Layers/LayersPanel";

function UtcClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toUTCString().replace("GMT", "UTC").split(" ").slice(1, 5).join(" ")
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono
                     text-slate-500 border border-white/6 rounded-lg px-2.5 py-1
                     bg-white/3 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      {time}
    </span>
  );
}

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center gap-5 px-5
                   bg-[#020611]/82 backdrop-blur-2xl border-b border-white/8"
      >
        {/* Brand */}
        <a href="#" className="flex items-center gap-3 shrink-0" aria-label="Earth 2100 home">
          <div className="w-11 h-11 grid place-items-center rounded-[14px] border border-cyan-400/50
                          bg-cyan-400/8 shadow-[0_0_24px_rgba(0,234,255,0.18)]">
            <Globe2 size={22} className="text-cyan-400" />
          </div>
          <div>
            <div className="font-black text-[16px] tracking-wider uppercase leading-none text-white">
              Earth 2100
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 leading-none tracking-wide">
              Earth Intelligence Platform
            </div>
          </div>
        </a>

        {/* Search */}
        <div className="flex-1 max-w-lg mx-auto">
          <label className="flex items-center gap-3 h-9 px-4 rounded-xl
                            border border-white/10 bg-white/4 backdrop-blur-sm
                            focus-within:border-cyan-400/40 focus-within:bg-white/6
                            transition-all duration-200">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="search"
              placeholder="Search region, signal, or climate event…"
              className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-300
                         placeholder:text-slate-500 min-w-0"
            />
          </label>
        </div>

        {/* UTC Clock */}
        <UtcClock />

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationPanel />
          <button className="w-9 h-9 grid place-items-center rounded-xl
                             text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
                  aria-label="Toggle theme">
            <Moon size={16} />
          </button>
           <LayersPanel />

          {/* Profile Section (Conditional based on Auth state) */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl
                           hover:bg-white/8 transition-colors cursor-pointer"
                aria-label="Profile"
              >
                <div className="relative">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User Profile"}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 bg-cyan-950/40
                                    grid place-items-center text-cyan-400 text-xs font-bold font-mono">
                      {user.email ? user.email[0].toUpperCase() : <User size={14} />}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                                   bg-green-400 border-2 border-[#020611]" />
                </div>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10
                               bg-slate-950/90 p-2.5 shadow-2xl backdrop-blur-2xl z-[60]"
                  >
                    {/* User Info */}
                    <div className="px-2.5 py-2 border-b border-white/6 mb-1.5">
                      <div className="text-xs font-bold text-white truncate">
                        {user.displayName || "Agent"}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                        {user.email}
                      </div>
                    </div>

                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs
                                 text-red-400 hover:bg-red-500/8 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider
                         text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.15)]
                         transition-all duration-150 cursor-pointer"
            >
              <LogIn size={14} />
              Sign In
            </button>
          )}
        </div>
      </motion.header>

      {/* Auth Modal Overlay */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
