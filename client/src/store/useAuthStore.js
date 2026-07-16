import { create } from "zustand";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from "../config/firebase.js";

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  // Initialize the auth listener
  initAuth: () => {
    if (!auth) {
      set({ loading: false });
      return () => {};
    }
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch ID Token
        const token = await firebaseUser.getIdToken();
        set({ 
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            token
          }, 
          loading: false,
          error: null 
        });
      } else {
        set({ user: null, loading: false });
      }
    });
  },

  // Helper to fetch valid token (auto-refreshes if expired)
  getToken: async () => {
    if (!auth) return null;
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken(true); // Force refresh
    set((state) => ({
      user: state.user ? { ...state.user, token } : null
    }));
    return token;
  },

  // Email/Password login
  loginWithEmail: async (email, password) => {
    if (!auth) throw new Error("Firebase Auth is not configured. Please add VITE_FIREBASE_API_KEY in client/.env.");
    set({ loading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Email/Password register
  registerWithEmail: async (email, password) => {
    if (!auth) throw new Error("Firebase Auth is not configured. Please add VITE_FIREBASE_API_KEY in client/.env.");
    set({ loading: true, error: null });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Google Login
  loginWithGoogle: async () => {
    if (!auth || !googleProvider) throw new Error("Firebase Auth or Google Provider is not configured. Please add VITE_FIREBASE_API_KEY in client/.env.");
    set({ loading: true, error: null });
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Logout
  logout: async () => {
    if (!auth) return;
    set({ loading: true, error: null });
    try {
      await signOut(auth);
      set({ user: null, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));

export default useAuthStore;
