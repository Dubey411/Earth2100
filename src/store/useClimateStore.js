import { create } from 'zustand';

const useClimateStore = create((set, get) => ({
  // Active region / sidebar
  activeRegion: null,
  sidebarOpen: false,

  // Globe state
  autoRotate: true,
  flyTarget: null,  // { lat, lng, altitude }
  handToolActive: true,

  // Climate signals (active set + per-signal intensity 0..1)
  activeSignals: new Set(),
  signalIntensity: {}, // { [id]: number 0..1 } — defaults to 1.0 if not set

  // Earth events
  activeEvents: new Set(),
  eventsOpen: true,

  // Planetary Futures drawer
  drawerOpen: false,
  sliderYear: 2050,
  activeScenario: 'crisis',

  // Actions
  setActiveRegion: (key) => set({ activeRegion: key, sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false, activeRegion: null }),

  setAutoRotate: (val) => set({ autoRotate: val }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  toggleHandTool: () => set((s) => ({ handToolActive: !s.handToolActive })),

  flyTo: (lat, lng, altitude = 2.0) => set({ flyTarget: { lat, lng, altitude } }),
  clearFlyTarget: () => set({ flyTarget: null }),

  toggleSignal: (id) => set((s) => {
    const next = new Set();
    if (!s.activeSignals.has(id)) {
      next.add(id);
    }
    return { activeSignals: next };
  }),

  setSignalIntensity: (id, value) => set((s) => ({
    signalIntensity: { ...s.signalIntensity, [id]: value },
  })),

  toggleEvent: (id) => set((s) => {
    const next = new Set(s.activeEvents);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { activeEvents: next };
  }),

  setEventsOpen: (val) => set({ eventsOpen: val }),
  toggleEventsOpen: () => set((s) => ({ eventsOpen: !s.eventsOpen })),

  setDrawerOpen: (val) => set({ drawerOpen: val }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),

  setSliderYear: (year) => set({ sliderYear: year }),
  setActiveScenario: (id) => set({ activeScenario: id }),
}));

export default useClimateStore;
