/**
 * useTimelineState.js
 *
 * Pure computation hook — NO side effects, NO store writes.
 * Given sliderYear (2025–2100) and activeScenario ('stable' | 'adapt' | 'crisis'),
 * returns a TimelineSnapshot with normalized intensities for every visual dimension.
 *
 * All callers receive the SAME object shape regardless of scenario, so layers
 * can just read snapshot.X without any scenario-specific branching.
 */

import { useMemo } from 'react'
import useClimateStore from './useClimateStore.js'

// ─── Per-scenario targets at year 2100 ───────────────────────────────────────
const SCENARIO_TARGETS = {
  stable: {
    tempC:       1.5,
    seaLevelM:   0.30,
    iceRemaining: 0.60,   // 60% of ice remaining
    fireScale:   1.2,
    forestLoss:  0.30,
    smogScale:   1.2,
    stormScale:  1.1,
    droughtScale: 1.2,
    color: '#00e6a8',
  },
  adapt: {
    tempC:       2.4,
    seaLevelM:   0.60,
    iceRemaining: 0.30,
    fireScale:   1.8,
    forestLoss:  0.60,
    smogScale:   1.8,
    stormScale:  1.4,
    droughtScale: 1.6,
    color: '#ffb72b',
  },
  crisis: {
    tempC:       4.3,
    seaLevelM:   1.20,
    iceRemaining: 0.05,
    fireScale:   3.0,
    forestLoss:  0.90,
    smogScale:   3.0,
    stormScale:  2.0,
    droughtScale: 2.5,
    color: '#ff4159',
  },
}

// ─── Baseline at 2025 ─────────────────────────────────────────────────────────
const BASELINE = {
  tempC:       1.1,
  seaLevelM:   0.05,
  iceRemaining: 1.0,
  fireScale:   1.0,
  forestLoss:  0.0,
  smogScale:   1.0,
  stormScale:  1.0,
  droughtScale: 1.0,
}

// ─── Lerp helper ──────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t

// ─── Ease-in-out cubic for smoother transitions ───────────────────────────────
const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

// ─── Map tempC to atmosphere color ───────────────────────────────────────────
function tempToAtmosphereColor(tempC) {
  // 1.1°C → blue #38d8ff
  // 2.0°C → cyan-yellow #88ddaa
  // 3.0°C → orange #ff8800
  // 4.3°C → deep red #ff2200
  const stops = [
    { t: 1.1, r: 0x38, g: 0xd8, b: 0xff },
    { t: 2.0, r: 0x88, g: 0xcc, b: 0x88 },
    { t: 3.0, r: 0xff, g: 0x88, b: 0x00 },
    { t: 4.3, r: 0xff, g: 0x22, b: 0x00 },
  ]
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (tempC >= stops[i].t && tempC <= stops[i + 1].t) {
      lo = stops[i]; hi = stops[i + 1]; break
    }
  }
  const f = hi.t === lo.t ? 0 : (tempC - lo.t) / (hi.t - lo.t)
  const r = Math.round(lerp(lo.r, hi.r, f))
  const g = Math.round(lerp(lo.g, hi.g, f))
  const b = Math.round(lerp(lo.b, hi.b, f))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * useTimelineState()
 *
 * Returns a memoised TimelineSnapshot based on current store values.
 * Re-computes only when sliderYear or activeScenario changes.
 */
export default function useTimelineState() {
  const sliderYear     = useClimateStore((s) => s.sliderYear)
  const activeScenario = useClimateStore((s) => s.activeScenario)
  const drawerOpen     = useClimateStore((s) => s.drawerOpen)

  return useMemo(() => {
    // t = linear progress 0..1 along the timeline
    const t    = Math.max(0, Math.min(1, (sliderYear - 2025) / (2100 - 2025)))
    const tE   = ease(t)  // eased t for visual smoothness

    const scenario = activeScenario in SCENARIO_TARGETS
      ? activeScenario
      : 'crisis'

    const targets = SCENARIO_TARGETS[scenario]

    // Interpolate each dimension from baseline → target
    const tempC        = lerp(BASELINE.tempC,        targets.tempC,        tE)
    const seaLevelM    = lerp(BASELINE.seaLevelM,    targets.seaLevelM,    tE)
    const iceRemaining = lerp(BASELINE.iceRemaining, targets.iceRemaining, tE)
    const fireScale    = lerp(BASELINE.fireScale,    targets.fireScale,    tE)
    const forestLoss   = lerp(BASELINE.forestLoss,   targets.forestLoss,   tE)
    const smogScale    = lerp(BASELINE.smogScale,    targets.smogScale,    tE)
    const stormScale   = lerp(BASELINE.stormScale,   targets.stormScale,   tE)
    const droughtScale = lerp(BASELINE.droughtScale, targets.droughtScale, tE)

    // Derived values
    const heatIntensity = Math.max(0, Math.min(1, (tempC - 1.0) / 3.5))    // 0 at 1°C, 1 at 4.5°C
    const seaLevel      = Math.max(0, Math.min(1, seaLevelM / 1.2))         // 0..1 normalised
    const iceAlpha      = iceRemaining                                        // 1 = full ice, 0 = gone

    return {
      // Raw values
      year:            sliderYear,
      scenario,
      t,                    // linear 0..1
      tE,                   // eased 0..1

      // Climate dimensions (all 0..1 or multipliers)
      tempC,
      heatIntensity,
      seaLevel,
      iceAlpha,
      fireScale,
      forestLoss,
      smogScale,
      stormScale,
      droughtScale,

      // Derived display
      scenarioColor:   targets.color,
      atmosphereColor: tempToAtmosphereColor(tempC),

      // Visibility gate — layers only activate when drawer is open
      active: drawerOpen,
    }
  }, [sliderYear, activeScenario, drawerOpen])
}

// Named export of scenario targets for external use (e.g. PlanetaryFutures)
export { SCENARIO_TARGETS, BASELINE }
