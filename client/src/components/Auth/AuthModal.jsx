import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, LogIn, UserPlus, Chrome, X, AlertCircle } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";

export default function AuthModal({ isOpen, onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState(null);

  const { loginWithEmail, registerWithEmail, loginWithGoogle, error: authError, loading } = useAuthStore();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (isRegister && password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    try {
      if (isRegister) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err) {
      // Auth store sets the error state
    }
  };

  const handleGoogleSubmit = async () => {
    setLocalError(null);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      // Auth store sets the error state
    }
  };

  const activeError = localError || authError;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020611]/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/10
                       bg-slate-950/85 p-6 shadow-2xl backdrop-blur-2xl"
          >
            {/* Background glowing effects */}
            <div className="pointer-events-none absolute -right-20 -top-20 z-0 h-40 w-40 rounded-full
                            bg-cyan-500/10 blur-[60px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 z-0 h-40 w-40 rounded-full
                            bg-purple-500/10 blur-[60px]" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/6 pb-4">
              <div>
                <h2 className="text-lg font-bold tracking-wider text-white uppercase">
                  {isRegister ? "Join Climate Lens" : "Access Platform"}
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isRegister ? "Create your credentials" : "Enter your access credentials"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/8 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {activeError && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="relative z-10 flex items-start gap-2.5 rounded-lg border border-red-500/20
                             bg-red-500/8 p-3 text-red-400"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed">{activeError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="relative z-10 mt-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="name@agency.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500
                               bg-white/4 border border-white/8 rounded-xl focus:outline-none 
                               focus:border-cyan-400/40 focus:bg-white/6 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500
                               bg-white/4 border border-white/8 rounded-xl focus:outline-none 
                               focus:border-cyan-400/40 focus:bg-white/6 transition-all duration-200"
                  />
                </div>
              </div>

              {isRegister && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                      <Lock size={16} />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500
                                 bg-white/4 border border-white/8 rounded-xl focus:outline-none 
                                 focus:border-cyan-400/40 focus:bg-white/6 transition-all duration-200"
                    />
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold
                           uppercase tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-300
                           disabled:bg-slate-800 disabled:text-slate-500 shadow-[0_0_16px_rgba(34,211,238,0.15)]
                           cursor-pointer active:scale-[0.98] transition-all duration-150"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                ) : isRegister ? (
                  <>
                    <UserPlus size={15} /> Create Account
                  </>
                ) : (
                  <>
                    <LogIn size={15} /> Sign In
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative z-10 flex items-center my-5 text-[10px] uppercase font-bold text-slate-600 tracking-wider">
              <div className="flex-grow border-t border-white/6"></div>
              <span className="mx-3">Or Authenticate With</span>
              <div className="flex-grow border-t border-white/6"></div>
            </div>

            {/* OAuth Sign in */}
            <button
              onClick={handleGoogleSubmit}
              disabled={loading}
              className="relative z-10 w-full h-10 flex items-center justify-center gap-2.5 rounded-xl text-xs font-semibold
                         text-slate-300 border border-white/10 hover:border-white/20 hover:bg-white/4 
                         disabled:opacity-50 cursor-pointer active:scale-[0.98] transition-all duration-150"
            >
              <Chrome size={15} className="text-cyan-400" />
              Continue with Google
            </button>

            {/* Toggle Signin/Register */}
            <div className="relative z-10 mt-6 text-center text-xs">
              <span className="text-slate-500">
                {isRegister ? "Already registered? " : "New to the platform? "}
              </span>
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setLocalError(null);
                }}
                className="text-cyan-400 hover:underline font-semibold"
              >
                {isRegister ? "Sign In" : "Request Credentials"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
