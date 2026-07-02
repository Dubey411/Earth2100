// import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
// import Globe from 'react-globe.gl'
// import * as THREE from 'three'
// import { HOTSPOTS } from '../../data/hotspots.js'
// import useClimateStore from '../../store/useClimateStore.js'
// import {
//   EARTH_BUMP,
//   EARTH_DAY,
//   INITIAL_POINT_OF_VIEW,
//   NIGHT_SKY,
// } from './globeConstants.js'
// import {
//   ENSO_ARCS,
//   FLOOD_RINGS,
//   SEALEVEL_RINGS,
//   SIGNAL_HOTSPOT_DATA,
// } from './signalLayerData.js'
// import { createLandMaskTexture } from './landMaskTexture.js'
// import { buildLocationPin, buildSignalHotspot } from './htmlOverlayBuilders.js'
// import { SIGNAL_ANIMATION_STYLES } from './signalAnimationStyles.js'
// import {
//   addCloudLayer,
//   addNightLights,
//   configureGlobeControls,
//   createHeatLayer,
//   updateHeatLayer,
// } from './sceneLayers.js'

// export default function EarthGlobe() {
//   const globeRef = useRef(null)
//   const cloudsRef = useRef(null)
//   const heatMeshRef = useRef(null)
//   const resumeRef = useRef(null)
//   const startTimeRef = useRef(0)
//   const rafRef = useRef(null)
//   const controlsRef = useRef(null)
//   const disposersRef = useRef([])

//   const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
//   const [isDragging, setIsDragging] = useState(false)

//   const autoRotate = useClimateStore((s) => s.autoRotate)
//   const flyTarget = useClimateStore((s) => s.flyTarget)
//   const handToolActive = useClimateStore((s) => s.handToolActive)
//   const activeSignals = useClimateStore((s) => s.activeSignals)
//   const signalIntensity = useClimateStore((s) => s.signalIntensity)
//   const setActiveRegion = useClimateStore((s) => s.setActiveRegion)
//   const clearFlyTarget = useClimateStore((s) => s.clearFlyTarget)
//   const flyTo = useClimateStore((s) => s.flyTo)

//   const maskTexture = useMemo(() => createLandMaskTexture(), [])

//   useEffect(() => {
//     const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
//     window.addEventListener('resize', onResize)
//     return () => window.removeEventListener('resize', onResize)
//   }, [])

//   const handleGlobeReady = useCallback(() => {
//     const globe = globeRef.current
//     if (!globe) return

//     const controls = globe.controls()
//     if (controls) {
//       controlsRef.current = configureGlobeControls({
//         controls,
//         getStoreState: useClimateStore.getState,
//         setIsDragging,
//         resumeRef,
//       })
//     }

//     globe.pointOfView(INITIAL_POINT_OF_VIEW, 0)

//     const scene = globe.scene()
//     const loader = new THREE.TextureLoader()

//     disposersRef.current.push(addNightLights(scene, loader))

//     const cloudLayer = addCloudLayer(scene, loader)
//     cloudsRef.current = cloudLayer.holder
//     disposersRef.current.push(cloudLayer.dispose)

//     const heatLayer = createHeatLayer(scene, maskTexture)
//     heatMeshRef.current = heatLayer.mesh
//     disposersRef.current.push(heatLayer.dispose)

//     startTimeRef.current = performance.now()

//     const tick = () => {
//       const t = (performance.now() - startTimeRef.current) / 1000
//       if (cloudsRef.current?.mesh) cloudsRef.current.mesh.rotation.y += 0.00055

//       updateHeatLayer({
//         heatMesh: heatMeshRef.current,
//         t,
//         cameraDistance: globeRef.current?.camera()?.position.length?.() ?? 450,
//       })

//       globeRef.current?.controls()?.update()
//       rafRef.current = requestAnimationFrame(tick)
//     }

//     rafRef.current = requestAnimationFrame(tick)
//   }, [maskTexture])

//   useEffect(() => () => {
//     if (controlsRef.current) {
//       const { controls, onStart, onEnd } = controlsRef.current
//       controls.removeEventListener('start', onStart)
//       controls.removeEventListener('end', onEnd)
//     }

//     if (rafRef.current) cancelAnimationFrame(rafRef.current)
//     clearTimeout(resumeRef.current)

//     disposersRef.current.forEach((dispose) => dispose?.())
//     disposersRef.current = []
//     maskTexture.dispose()
//   }, [maskTexture])

//   useEffect(() => {
//     const controls = globeRef.current?.controls()
//     if (!controls) return
//     controls.autoRotate = autoRotate
//     if (!autoRotate) clearTimeout(resumeRef.current)
//   }, [autoRotate])

//   useEffect(() => {
//     const controls = globeRef.current?.controls()
//     if (!controls) return
//     controls.enableRotate = handToolActive
//   }, [handToolActive])

//   useEffect(() => {
//     if (!flyTarget || !globeRef.current) return
//     globeRef.current.pointOfView(
//       { lat: flyTarget.lat, lng: flyTarget.lng, altitude: flyTarget.altitude },
//       1500,
//     )
//     clearFlyTarget()
//   }, [flyTarget, clearFlyTarget])

//   useEffect(() => {
//     const mesh = heatMeshRef.current
//     if (!mesh) return

//     const active = activeSignals.has('heat')
//     mesh.visible = active
//     if (active) {
//       mesh.material.uniforms.uIntensity.value = signalIntensity.heat ?? 1.0
//     }
//   }, [activeSignals, signalIntensity])

//   const cursor = useMemo(() => {
//     if (!handToolActive) return 'default'
//     return isDragging ? 'grabbing' : 'grab'
//   }, [handToolActive, isDragging])

//   const signalHtmlData = useMemo(() => {
//     const points = []
//     activeSignals.forEach((sigId) => {
//       if (sigId === 'heat') return
//       const hotspots = SIGNAL_HOTSPOT_DATA[sigId]
//       if (!hotspots) return
//       const intensity = signalIntensity[sigId] ?? 1.0
//       hotspots.forEach((hp) => points.push({ ...hp, _sigId: sigId, _intensity: intensity }))
//     })
//     return points
//   }, [activeSignals, signalIntensity])

//   const allHtmlData = useMemo(() => [
//     ...HOTSPOTS.map((h) => ({ ...h, _type: 'location' })),
//     ...signalHtmlData.map((h) => ({ ...h, _type: 'signal' })),
//   ], [signalHtmlData])

//   const buildSignalEl = useCallback(
//     (d) => buildSignalHotspot(d, d._sigId, d._intensity ?? 1.0),
//     [],
//   )

//   const buildHtmlElement = useCallback((d) => {
//     if (d._type === 'signal') return buildSignalEl(d)
//     return buildLocationPin(d, { setActiveRegion, flyTo })
//   }, [buildSignalEl, setActiveRegion, flyTo])

//   const ringsData = useMemo(() => {
//     const rings = []
//     if (activeSignals.has('flood')) FLOOD_RINGS.forEach((p) => rings.push({ ...p, _t: 'flood' }))
//     if (activeSignals.has('sealevel')) SEALEVEL_RINGS.forEach((p) => rings.push({ ...p, _t: 'sl' }))
//     return rings
//   }, [activeSignals])

//   const arcsData = useMemo(() => {
//     if (!activeSignals.has('enso')) return []
//     return ENSO_ARCS.map((arc, i) => ({
//       ...arc,
//       dashLength: 0.35,
//       dashGap: 0.18,
//       dashAnimateTime: 2800 + i * 400,
//     }))
//   }, [activeSignals])

//   return (
//     <div style={{ position: 'absolute', inset: 0, width: size.w, height: size.h, cursor }}>
//       <Globe
//         ref={globeRef}
//         width={size.w}
//         height={size.h}
//         backgroundColor="rgba(0,0,0,0)"
//         waitForGlobeReady={false}
//         globeImageUrl={EARTH_DAY}
//         bumpImageUrl={EARTH_BUMP}
//         showAtmosphere={true}
//         atmosphereColor="#38d8ff"
//         atmosphereAltitude={0.18}
//         backgroundImageUrl={NIGHT_SKY}
//         htmlElementsData={allHtmlData}
//         htmlLat="lat"
//         htmlLng="lng"
//         htmlAltitude={(d) => d._type === 'signal' ? 0.012 : 0.01}
//         htmlElement={buildHtmlElement}
//         ringsData={ringsData}
//         ringLat="lat"
//         ringLng="lng"
//         ringColor={(d) => d._t === 'sl' ? '#00bfff' : '#3399ff'}
//         ringMaxRadius={3.5}
//         ringPropagationSpeed={1.2}
//         ringRepeatPeriod={1600}
//         arcsData={arcsData}
//         arcStartLat="startLat"
//         arcStartLng="startLng"
//         arcEndLat="endLat"
//         arcEndLng="endLng"
//         arcColor="color"
//         arcDashLength="dashLength"
//         arcDashGap="dashGap"
//         arcDashAnimateTime="dashAnimateTime"
//         arcStroke={0.6}
//         arcAltitude={0.035}
//         onGlobeReady={handleGlobeReady}
//       />
//       <style>{SIGNAL_ANIMATION_STYLES}</style>
//     </div>
//   )
// }


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
import { createLandMaskTexture } from './landMaskTexture.js'
import { buildLocationPin, buildSignalHotspot } from './htmlOverlayBuilders.js'
import { SIGNAL_ANIMATION_STYLES } from './signalAnimationStyles.js'
import {
  addCloudLayer,
  addNightLights,
  configureGlobeControls,
  createHeatLayer,
  updateHeatLayer,
  updateCloudLayer,
  updateNightLights,
} from './sceneLayers.js'

// Cache stable values
const INITIAL_SIZE = { w: window.innerWidth, h: window.innerHeight }

export default function EarthGlobe() {
  const globeRef = useRef(null)
  const cloudsRef = useRef(null)
  const heatMeshRef = useRef(null)
  const resumeRef = useRef(null)
  const startTimeRef = useRef(0)
  const rafRef = useRef(null)
  const controlsRef = useRef(null)
  const disposersRef = useRef([])
  const lastUniformUpdate = useRef(0)

  const [size, setSize] = useState(INITIAL_SIZE)
  const [isDragging, setIsDragging] = useState(false)

  const autoRotate = useClimateStore((s) => s.autoRotate)
  const flyTarget = useClimateStore((s) => s.flyTarget)
  const handToolActive = useClimateStore((s) => s.handToolActive)
  const activeSignals = useClimateStore((s) => s.activeSignals)
  const signalIntensity = useClimateStore((s) => s.signalIntensity)
  const setActiveRegion = useClimateStore((s) => s.setActiveRegion)
  const clearFlyTarget = useClimateStore((s) => s.clearFlyTarget)
  const flyTo = useClimateStore((s) => s.flyTo)

  const maskTexture = useMemo(() => createLandMaskTexture(), [])

  // Throttled resize
  useEffect(() => {
    let resizeTimeout = null
    const onResize = () => {
      if (resizeTimeout) return
      resizeTimeout = setTimeout(() => {
        setSize({ w: window.innerWidth, h: window.innerHeight })
        resizeTimeout = null
      }, 100)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (resizeTimeout) clearTimeout(resizeTimeout)
    }
  }, [])

  // Animation loop with cloud sync
  const animate = useCallback(() => {
    const globe = globeRef.current
    if (!globe) {
      rafRef.current = requestAnimationFrame(animate)
      return
    }

    const t = (performance.now() - startTimeRef.current) / 1000
    const scene = globe.scene?.()
    const camera = globe.camera?.()
    const cameraDistance = camera?.position?.length?.() ?? 450
    
    // Get cloud rotation for sync
    let cloudRotation = 0
    if (cloudsRef.current?.mesh) {
      cloudRotation = cloudsRef.current.mesh.rotation.y
    }

    // Update all layers
    const now = performance.now()
    if (now - lastUniformUpdate.current >= 16.67) {
      // Update clouds
      if (cloudsRef.current?.mesh) {
        updateCloudLayer({
          cloudMesh: cloudsRef.current.mesh,
          time: t,
          cameraDistance,
        })
      }
      
      // Update heat with cloud sync
      updateHeatLayer({
        heatMesh: heatMeshRef.current,
        t,
        cameraDistance,
        cloudRotation, // Pass cloud rotation for sync
      })
      
      // Update night lights
      if (scene) {
        updateNightLights({ scene, time: t })
      }
      
      lastUniformUpdate.current = now
    }

    // Update controls
    const controls = globe.controls?.()
    if (controls?.update) {
      controls.update()
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current
    if (!globe) return

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

    const scene = globe.scene()
    const loader = new THREE.TextureLoader()

    disposersRef.current.push(addNightLights(scene, loader))

    const cloudLayer = addCloudLayer(scene, loader)
    cloudsRef.current = cloudLayer.holder
    disposersRef.current.push(cloudLayer.dispose)

    const heatLayer = createHeatLayer(scene, maskTexture)
    heatMeshRef.current = heatLayer.mesh
    disposersRef.current.push(heatLayer.dispose)

    startTimeRef.current = performance.now()
    lastUniformUpdate.current = 0

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
  }, [maskTexture, animate])

  // Cleanup
  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        const { controls, onStart, onEnd } = controlsRef.current
        controls?.removeEventListener?.('start', onStart)
        controls?.removeEventListener?.('end', onEnd)
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      if (resumeRef.current) {
        clearTimeout(resumeRef.current)
        resumeRef.current = null
      }

      disposersRef.current.forEach((dispose) => dispose?.())
      disposersRef.current = []

      if (maskTexture) {
        maskTexture.dispose()
      }
    }
  }, [maskTexture])

  // Auto-rotate
  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    if (controls.autoRotate !== autoRotate) {
      controls.autoRotate = autoRotate
    }
    if (!autoRotate) {
      clearTimeout(resumeRef.current)
    }
  }, [autoRotate])

  // Hand tool
  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    if (controls.enableRotate !== handToolActive) {
      controls.enableRotate = handToolActive
    }
  }, [handToolActive])

  // Fly target
  useEffect(() => {
    if (!flyTarget || !globeRef.current) return
    globeRef.current.pointOfView(
      { lat: flyTarget.lat, lng: flyTarget.lng, altitude: flyTarget.altitude },
      1500,
    )
    clearFlyTarget()
  }, [flyTarget, clearFlyTarget])

  // Heat visibility
  useEffect(() => {
    const mesh = heatMeshRef.current
    if (!mesh) return

    const active = activeSignals.has('heat')
    console.log('🔴 Heat Stress clicked:', { 
    active, 
    activeSignals: Array.from(activeSignals),
    intensity: signalIntensity.heat 
  })
    mesh.visible = active
    
    if (active) {
      const intensity = signalIntensity.heat ?? 1.0
      const uniforms = mesh.material.uniforms
      if (uniforms?.uIntensity && uniforms.uIntensity.value !== intensity) {
        uniforms.uIntensity.value = intensity
      }
    }
  }, [activeSignals, signalIntensity.heat])

  // Memoized data
  const cursor = useMemo(() => {
    if (!handToolActive) return 'default'
    return isDragging ? 'grabbing' : 'grab'
  }, [handToolActive, isDragging])

  const signalHtmlData = useMemo(() => {
    const points = []
    activeSignals.forEach((sigId) => {
      if (sigId === 'heat') return
      const hotspots = SIGNAL_HOTSPOT_DATA[sigId]
      if (!hotspots) return
      const intensity = signalIntensity[sigId] ?? 1.0
      hotspots.forEach((hp) => points.push({ ...hp, _sigId: sigId, _intensity: intensity }))
    })
    return points
  }, [activeSignals, signalIntensity])

  const allHtmlData = useMemo(() => {
    const locationData = HOTSPOTS.map((h) => ({ ...h, _type: 'location' }))
    const signalData = signalHtmlData.map((h) => ({ ...h, _type: 'signal' }))
    return [...locationData, ...signalData]
  }, [signalHtmlData])

  const buildSignalEl = useCallback(
    (d) => buildSignalHotspot(d, d._sigId, d._intensity ?? 1.0),
    []
  )

  const buildHtmlElement = useCallback(
    (d) => {
      if (d._type === 'signal') return buildSignalEl(d)
      return buildLocationPin(d, { setActiveRegion, flyTo })
    },
    [buildSignalEl, setActiveRegion, flyTo]
  )

  const ringsData = useMemo(() => {
    const rings = []
    if (activeSignals.has('flood')) {
      FLOOD_RINGS.forEach((p) => rings.push({ ...p, _t: 'flood' }))
    }
    if (activeSignals.has('sealevel')) {
      SEALEVEL_RINGS.forEach((p) => rings.push({ ...p, _t: 'sl' }))
    }
    return rings
  }, [activeSignals])

  const arcsData = useMemo(() => {
    if (!activeSignals.has('enso')) return []
    return ENSO_ARCS.map((arc, i) => ({
      ...arc,
      dashLength: 0.35,
      dashGap: 0.18,
      dashAnimateTime: 2800 + i * 400,
    }))
  }, [activeSignals])

  return (
    <div style={{ position: 'absolute', inset: 0, width: size.w, height: size.h, cursor }}>
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        waitForGlobeReady={false}
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
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d) => d._t === 'sl' ? '#00bfff' : '#3399ff'}
        ringMaxRadius={3.5}
        ringPropagationSpeed={1.2}
        ringRepeatPeriod={1600}
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength="dashLength"
        arcDashGap="dashGap"
        arcDashAnimateTime="dashAnimateTime"
        arcStroke={0.6}
        arcAltitude={0.035}
        onGlobeReady={handleGlobeReady}
      />
      <style>{SIGNAL_ANIMATION_STYLES}</style>
    </div>
  )
}