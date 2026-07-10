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
import { addCloudLayer,
  addNightLights,
  configureGlobeControls,
  createHeatLayer,
  updateHeatLayer,
} from './sceneLayers.js'
import worldCountries from '../../../geojson/world.geo.json/countries.geo.json'
import FloodLayer from './FloodLayer/index.jsx'
import ElNinoLayer from './ElNinoLayer/index.jsx'
import StormLayer from './StormLayer/index.jsx'
import AirPollutionLayer from './AirPollutionLayer/index.jsx'

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

  const [size,          setSize]          = useState(INITIAL_SIZE)
  const [isDragging,    setIsDragging]    = useState(false)
  const [globeInstance, setGlobeInstance] = useState(null)

  const autoRotate      = useClimateStore((s) => s.autoRotate)
  const flyTarget       = useClimateStore((s) => s.flyTarget)
  const handToolActive  = useClimateStore((s) => s.handToolActive)
  const activeSignals   = useClimateStore((s) => s.activeSignals)
  const signalIntensity = useClimateStore((s) => s.signalIntensity)
  const setActiveRegion = useClimateStore((s) => s.setActiveRegion)
  const clearFlyTarget  = useClimateStore((s) => s.clearFlyTarget)
  const flyTo           = useClimateStore((s) => s.flyTo)

  // ── Land mask texture (rasterised from GeoJSON, white=land black=ocean) ──────
  const maskTexture = useMemo(() => {
    const W = 2048, H = 1024
    const canvas = document.createElement('canvas')
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    // Fill ocean (black)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)

    // Draw land polygons (white)
    ctx.fillStyle = '#ffffff'

    const project = ([lng, lat]) => [
      ((lng + 180) / 360) * W,
      ((90 - lat)  / 180) * H,
    ]

    const drawRing = (ring) => {
      if (ring.length < 3) return
      ctx.beginPath()
      const [x0, y0] = project(ring[0])
      ctx.moveTo(x0, y0)
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = project(ring[i])
        ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
    }

    const features = worldCountries?.features ?? []
    features.forEach(({ geometry }) => {
      if (!geometry) return
      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(drawRing)
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((poly) => poly.forEach(drawRing))
      }
    })

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    console.log('🗺️ Land mask texture generated from GeoJSON')
    return tex
  }, [])

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

    // 5. Add Heat layer (GPU shader sphere) — pass land mask
    const heatLayer = createHeatLayer(scene, loader, maskTexture)
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

    // Trigger state update so React child components can mount
    setGlobeInstance(globe)
  }, [maskTexture])

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

  // ── Active rings data (water ripples for Flood and Sea Level) ───────────────
  const activeRings = useMemo(() => {
    const rings = []

    // Flood ripples are now handled in the custom shader layer of the modular <FloodLayer /> component

    if (activeSignals.has('sealevel')) {
      const intensity = signalIntensity.sealevel ?? 1.0
      SEALEVEL_RINGS.forEach((r) => {
        rings.push({
          ...r,
          maxR: 8.5 * intensity,
          propagationSpeed: 1.8 * intensity,
          repeatPeriod: 2200 / intensity,
          // Returns color interpolator function t => color
          colorFn: () => (t) => `rgba(0, 255, 242, ${(1 - t) * 0.88 * intensity})`,
        })
      })
    }

    return rings
  }, [activeSignals, signalIntensity])

  // ── Active arcs data (atmospheric/ocean current lines for ENSO) ──────────────
  const activeArcs = useMemo(() => {
    // Redesigned ENSO layer uses custom particles inside <ElNinoLayer />.
    // Return empty array so no default orange arcs are drawn.
    return []
  }, [])

  const signalHtmlData = useMemo(() => {
    // All active signals (heat, flood, air, storm, enso) now use custom animated layers.
    // Return empty array to completely remove all old HTML hotspot dots.
    return []
  }, [])

  // Hide location pins when any climate signal is active to keep the view focused on the animations
  const hasActiveSignal = activeSignals.size > 0

  const allHtmlData = useMemo(() => [
    ...(!hasActiveSignal ? HOTSPOTS.map((h) => ({ ...h, _type: 'location' })) : []),
    ...signalHtmlData.map((h) => ({ ...h, _type: 'signal' })),
  ], [signalHtmlData, hasActiveSignal])

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
        
        // Rippling rings layer (Sea Level / Flood is delegated to custom shader)
        ringsData={activeRings}
        ringColor={(d) => d.colorFn()}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"

        // Dynamic flowing arcs layer (ENSO currents)
        arcsData={activeArcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcStroke="stroke"
        arcDashLength="dashLength"
        arcDashGap="dashGap"
        arcDashAnimateTime="dashAnimateTime"
      />
      {globeInstance && activeSignals.has('flood') && (
        <FloodLayer
          globe={globeInstance}
          scene={globeInstance.scene()}
          maskTexture={maskTexture}
        />
      )}
      {globeInstance && activeSignals.has('enso') && (
        <ElNinoLayer
          globe={globeInstance}
          scene={globeInstance.scene()}
          maskTexture={maskTexture}
        />
      )}
      {globeInstance && activeSignals.has('storm') && (
        <StormLayer
          globe={globeInstance}
          scene={globeInstance.scene()}
        />
      )}
      {globeInstance && activeSignals.has('air') && (
        <AirPollutionLayer
          globe={globeInstance}
          scene={globeInstance.scene()}
        />
      )}
      <style>{SIGNAL_ANIMATION_STYLES}</style>
    </div>
  )
}