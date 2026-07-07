import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import Globe from 'react-globe.gl'
import * as THREE from 'three'
import { HOTSPOTS } from '../../data/hotspots.js'
import useClimateStore from '../../store/useClimateStore.js'
import {
  EARTH_BUMP,
  EARTH_DAY,
  INITIAL_POINT_OF_VIEW,
  NIGHT_SKY,
} from './globeConstants.js'
import {
  ENSO_ARCS,
  FLOOD_RINGS,
  SEALEVEL_RINGS,
  SIGNAL_HOTSPOT_DATA,
} from './signalLayerData.js'
import { buildLocationPin, buildSignalHotspot } from './htmlOverlayBuilders.js'
import { SIGNAL_ANIMATION_STYLES } from './signalAnimationStyles.js'
import {
  addCloudLayer,
  addNightLights,
  configureGlobeControls,
  createHeatLayer,
  updateHeatLayer,
} from './sceneLayers.js'

const INITIAL_SIZE = { w: window.innerWidth, h: window.innerHeight }

export default function EarthGlobe() {
  console.log('💚 EarthGlobe component render!')
  const globeRef     = useRef(null)
  const cloudsRef    = useRef(null)
  const heatMeshRef  = useRef(null)
  const resumeRef    = useRef(null)
  const startTimeRef = useRef(0)
  const rafRef       = useRef(null)
  const controlsRef  = useRef(null)
  const disposersRef = useRef([])

  const [size,       setSize]       = useState(INITIAL_SIZE)
  const [isDragging, setIsDragging] = useState(false)

  const autoRotate      = useClimateStore((s) => s.autoRotate)
  const flyTarget       = useClimateStore((s) => s.flyTarget)
  const handToolActive  = useClimateStore((s) => s.handToolActive)
  const activeSignals   = useClimateStore((s) => s.activeSignals)
  const signalIntensity = useClimateStore((s) => s.signalIntensity)
  const setActiveRegion = useClimateStore((s) => s.setActiveRegion)
  const clearFlyTarget  = useClimateStore((s) => s.clearFlyTarget)
  const flyTo           = useClimateStore((s) => s.flyTo)

  // ── Resize ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let timer = null
    const onResize = () => {
      if (timer) return
      timer = setTimeout(() => {
        setSize({ w: window.innerWidth, h: window.innerHeight })
        timer = null
      }, 100)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (timer) clearTimeout(timer)
    }
  }, [])

  // ── Callback Ref to safely initialize Globe ─────────────────────────────────
  const handleGlobeRef = useCallback((globe) => {
    // 1. Cleanup previous instance if ref changed or unmounted
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    disposersRef.current.forEach((d) => d?.())
    disposersRef.current = []

    if (!globe) {
      globeRef.current = null
      return
    }

    globeRef.current = globe
    console.log('💚 handleGlobeRef: Globe instance mounted!')

    // 2. Initialize controls
    const controls = globe.controls()
    if (controls) {
      controlsRef.current = configureGlobeControls({
        controls,
        getStoreState: useClimateStore.getState,
        setIsDragging,
        resumeRef,
      })
    }

    globe.pointOfView(INITIAL_POINT_OF_VIEW, 0)

    const scene  = globe.scene()
    const loader = new THREE.TextureLoader()

    // 3. Add Night Lights
    disposersRef.current.push(addNightLights(scene, loader))

    // 4. Add Cloud layer
    const cloudLayer = addCloudLayer(scene, loader)
    cloudsRef.current = cloudLayer.holder
    disposersRef.current.push(cloudLayer.dispose)

    // 5. Add Heat layer (GPU shader sphere)
    const heatLayer = createHeatLayer(scene)
    const heatMesh  = heatLayer.mesh
    heatMeshRef.current = heatMesh
    disposersRef.current.push(heatLayer.dispose)

    // Sync helper - controls visibility from store
    const syncHeat = (state) => {
      const active    = state.activeSignals.has('heat')
      const intensity = state.signalIntensity.heat ?? 1.0
      heatMesh.visible = active
      heatMesh.material.uniforms.uIntensity.value = active ? intensity : 0.0
      console.log('🔥 Heat layer visibility synced:', active, 'intensity:', intensity)
    }

    // Apply current state immediately, then subscribe to future changes
    syncHeat(useClimateStore.getState())
    const unsubHeat = useClimateStore.subscribe(syncHeat)
    disposersRef.current.push(unsubHeat)

    // 6. Start RAF animation loop
    startTimeRef.current = performance.now()

    const tick = () => {
      const t = (performance.now() - startTimeRef.current) / 1000

      // Rotate clouds
      if (cloudsRef.current?.mesh) {
        cloudsRef.current.mesh.rotation.y += 0.00055
      }

      // Update heat uniform
      updateHeatLayer({ heatMesh, t })

      globe.controls()?.update()
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        const { controls, onStart, onEnd } = controlsRef.current
        controls?.removeEventListener?.('start', onStart)
        controls?.removeEventListener?.('end', onEnd)
      }
      if (rafRef.current)    cancelAnimationFrame(rafRef.current)
      if (resumeRef.current) clearTimeout(resumeRef.current)
      disposersRef.current.forEach((d) => d?.())
      disposersRef.current = []
    }
  }, [])

  // ── Globe control effects ────────────────────────────────────────────────────
  useEffect(() => {
    const c = globeRef.current?.controls()
    if (!c) return
    c.autoRotate = autoRotate
    if (!autoRotate) clearTimeout(resumeRef.current)
  }, [autoRotate])

  useEffect(() => {
    const c = globeRef.current?.controls()
    if (!c) return
    c.enableRotate = handToolActive
  }, [handToolActive])

  useEffect(() => {
    if (!flyTarget || !globeRef.current) return
    globeRef.current.pointOfView(
      { lat: flyTarget.lat, lng: flyTarget.lng, altitude: flyTarget.altitude },
      1500,
    )
    clearFlyTarget()
  }, [flyTarget, clearFlyTarget])

  // ── Memoised data ───────────────────────────────────────────────────────────
  const cursor = useMemo(() => {
    if (!handToolActive) return 'default'
    return isDragging ? 'grabbing' : 'grab'
  }, [handToolActive, isDragging])

  const signalHtmlData = useMemo(() => {
    const pts = []
    activeSignals.forEach((sigId) => {
      if (sigId === 'heat') return   // heat is a shader layer, not HTML dots
      const hotspots = SIGNAL_HOTSPOT_DATA[sigId]
      if (!hotspots) return
      const intensity = signalIntensity[sigId] ?? 1.0
      hotspots.forEach((hp) => pts.push({ ...hp, _sigId: sigId, _intensity: intensity }))
    })
    return pts
  }, [activeSignals, signalIntensity])

  const allHtmlData = useMemo(() => [
    ...HOTSPOTS.map((h) => ({ ...h, _type: 'location' })),
    ...signalHtmlData.map((h) => ({ ...h, _type: 'signal' })),
  ], [signalHtmlData])

  const buildSignalEl = useCallback(
    (d) => buildSignalHotspot(d, d._sigId, d._intensity ?? 1.0),
    [],
  )

  const buildHtmlElement = useCallback((d) => {
    if (d._type === 'signal')   return buildSignalEl(d)
    return buildLocationPin(d, { setActiveRegion, flyTo })
  }, [buildSignalEl, setActiveRegion, flyTo])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, width: size.w, height: size.h, cursor }}>
      <Globe
        ref={handleGlobeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={EARTH_DAY}
        bumpImageUrl={EARTH_BUMP}
        showAtmosphere={true}
        atmosphereColor="#38d8ff"
        atmosphereAltitude={0.18}
        backgroundImageUrl={NIGHT_SKY}
        htmlElementsData={allHtmlData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={(d) => d._type === 'signal' ? 0.012 : 0.01}
        htmlElement={buildHtmlElement}
        ringsData={[]}
        arcsData={[]}
      />
      <style>{SIGNAL_ANIMATION_STYLES}</style>
    </div>
  )
}