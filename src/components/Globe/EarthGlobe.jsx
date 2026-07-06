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
} from './sceneLayers.js'

const INITIAL_SIZE = { w: window.innerWidth, h: window.innerHeight }

// ============================================================
// ADVANCED THERMAL MAP FUNCTIONS
// ============================================================

function getTemperature(lat, lng, time) {
  // 1. Base latitudinal gradient (equator warm, poles cold)
  let temp = Math.cos(lat * Math.PI / 180)
  temp = temp * 0.7 + 0.3
  
  // 2. Seasonal variation
  const season = Math.sin(time * 0.0172 + lat * 0.01) * 0.08
  temp += season
  
  // 3. Ocean temperature (warmer currents, cooler upwelling)
  const absLat = Math.abs(lat)
  
  // Gulf Stream (warm)
  const gulf = Math.exp(-Math.pow((lat - 30) / 8, 2) - Math.pow((lng + 75) / 10, 2))
  temp += gulf * 0.15
  
  // Kuroshio (warm)
  const kuro = Math.exp(-Math.pow((lat - 30) / 8, 2) - Math.pow((lng - 135) / 10, 2))
  temp += kuro * 0.12
  
  // Humboldt (cold)
  const humboldt = Math.exp(-Math.pow((lat + 15) / 10, 2) - Math.pow((lng + 80) / 12, 2))
  temp -= humboldt * 0.10
  
  // Benguela (cold)
  const benguela = Math.exp(-Math.pow((lat + 25) / 10, 2) - Math.pow((lng + 15) / 10, 2))
  temp -= benguela * 0.08
  
  // 4. Land temperature (hotter over continents)
  const isLand = isOnLand(lat, lng)
  if (isLand) {
    temp += 0.08 // Land heats more
    
    // Desert regions
    const sahara = Math.exp(-Math.pow((lat - 23) / 10, 2) - Math.pow((lng - 10) / 15, 2))
    temp += sahara * 0.25
    
    const arabia = Math.exp(-Math.pow((lat - 25) / 8, 2) - Math.pow((lng - 45) / 10, 2))
    temp += arabia * 0.22
    
    const australia = Math.exp(-Math.pow((lat + 25) / 10, 2) - Math.pow((lng - 135) / 15, 2))
    temp += australia * 0.20
    
    // Tropical rainforests
    const amazon = Math.exp(-Math.pow((lat + 5) / 12, 2) - Math.pow((lng + 60) / 15, 2))
    temp += amazon * 0.18
    
    const congo = Math.exp(-Math.pow((lat + 0) / 10, 2) - Math.pow((lng + 25) / 12, 2))
    temp += congo * 0.18
    
    // Mid-latitude regions
    const na = Math.exp(-Math.pow((lat - 35) / 12, 2) - Math.pow((lng + 100) / 18, 2))
    temp += na * 0.20
    
    const europe = Math.exp(-Math.pow((lat - 45) / 8, 2) - Math.pow((lng - 10) / 12, 2))
    temp += europe * 0.16
    
    const asia = Math.exp(-Math.pow((lat - 40) / 12, 2) - Math.pow((lng - 90) / 20, 2))
    temp += asia * 0.18
    
    const india = Math.exp(-Math.pow((lat - 20) / 8, 2) - Math.pow((lng - 78) / 10, 2))
    temp += india * 0.20
  }
  
  // 5. ENSO effect (equatorial Pacific)
  if (absLat < 20 && Math.abs(lng + 150) < 30) {
    const enso = Math.exp(-Math.pow((lat - 0) / 10, 2) - Math.pow((lng + 150) / 20, 2))
    const phase = Math.sin(time * 0.008) * 0.5 + 0.5
    temp += enso * phase * 0.15
  }
  
  // 6. Random noise for natural variation
  const noise = (Math.random() - 0.5) * 0.04
  temp += noise
  
  return Math.max(0, Math.min(1, temp))
}

function isOnLand(lat, lng) {
  const absLat = Math.abs(lat)
  
  // Antarctica
  if (absLat > 70) return true
  
  // Ocean regions (simplified)
  // Pacific Ocean
  if (lng > -130 && lng < -70 && absLat < 40) return false
  if (lng > 150 && lng < 170 && absLat < 20) return false
  if (lng > 170 && lng < -140 && absLat < 30) return false
  
  // Atlantic Ocean
  if (lng > -60 && lng < -10 && absLat < 50) return false
  if (lng > -10 && lng < 10 && absLat < 30) return false
  
  // Indian Ocean
  if (lng > 70 && lng < 100 && absLat < 30) return false
  if (lng > 100 && lng < 120 && absLat < 10) return false
  
  // Southern Ocean
  if (absLat > 50 && lng > -180 && lng < 180) return true
  
  return true
}

function getThermalColor(t) {
  const s = Math.max(0, Math.min(1, t))
  
  // NASA thermal palette - 10 colors
  const colors = [
    [0.00, 0.00, 0.60],  // Very cold (deep blue)
    [0.00, 0.15, 0.95],  // Cold (bright blue)
    [0.00, 0.60, 0.95],  // Cool (light blue)
    [0.00, 0.85, 0.85],  // Moderate (cyan)
    [0.00, 0.90, 0.40],  // Warm (green)
    [0.60, 0.95, 0.00],  // Warmer (yellow-green)
    [0.95, 0.95, 0.00],  // Hot (yellow)
    [0.95, 0.60, 0.00],  // Very hot (orange)
    [0.90, 0.20, 0.00],  // Extreme (red)
    [0.70, 0.00, 0.00]   // Critical (dark red)
  ]
  
  const idx = s * 9
  const i = Math.min(Math.floor(idx), 8)
  const frac = Math.min(idx - i, 1)
  
  const c1 = colors[i]
  const c2 = colors[Math.min(i + 1, 9)]
  
  // Smooth Hermite interpolation
  const f = frac * frac * (3 - 2 * frac)
  
  const r = c1[0] + (c2[0] - c1[0]) * f
  const g = c1[1] + (c2[1] - c1[1]) * f
  const b = c1[2] + (c2[2] - c1[2]) * f
  
  return `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`
}

function getHeatMapSize(temp) {
  // Smaller, uniform dots for mosaic effect
  return 2.5 // Fixed small size
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EarthGlobe() {
  const globeRef = useRef(null)
  const cloudsRef = useRef(null)
  const resumeRef = useRef(null)
  const startTimeRef = useRef(0)
  const rafRef = useRef(null)
  const controlsRef = useRef(null)
  const disposersRef = useRef([])

  const [size, setSize] = useState(INITIAL_SIZE)
  const [isDragging, setIsDragging] = useState(false)
  const [heatPoints, setHeatPoints] = useState([])

  const autoRotate = useClimateStore((s) => s.autoRotate)
  const flyTarget = useClimateStore((s) => s.flyTarget)
  const handToolActive = useClimateStore((s) => s.handToolActive)
  const activeSignals = useClimateStore((s) => s.activeSignals)
  const signalIntensity = useClimateStore((s) => s.signalIntensity)
  const setActiveRegion = useClimateStore((s) => s.setActiveRegion)
  const clearFlyTarget = useClimateStore((s) => s.clearFlyTarget)
  const flyTo = useClimateStore((s) => s.flyTo)

  const maskTexture = useMemo(() => createLandMaskTexture(), [])

  // Resize handler
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

  // ✅ ADVANCED HEAT MAP GENERATION - FULL GLOBE COVERAGE
  useEffect(() => {
    const isActive = activeSignals.has('heat')
    
    if (!isActive) {
      setHeatPoints([])
      return
    }

    console.log('🔥 Generating full Earth heat map...')
    
    const points = []
    const intensity = signalIntensity.heat ?? 1.0
    const time = Date.now() / 1000
    
    // Higher resolution for mosaic effect
    const step = 2.0 // degrees (tighter grid)
    
    // Track temperature ranges for debugging
    let minTemp = 1
    let maxTemp = 0
    let totalPoints = 0
    
    // Generate points for entire globe
    for (let lat = -85; lat <= 85; lat += step) {
      for (let lng = -180; lng <= 180; lng += step) {
        // Calculate temperature
        const temp = getTemperature(lat, lng, time)
        const scaledTemp = temp * intensity
        
        // Track ranges
        if (scaledTemp < minTemp) minTemp = scaledTemp
        if (scaledTemp > maxTemp) maxTemp = scaledTemp
        totalPoints++
        
        // Only skip if extremely cold (below 2%)
        if (scaledTemp < 0.02) continue
        
        const color = getThermalColor(scaledTemp)
        const size = getHeatMapSize(scaledTemp)
        
        points.push({
          lat,
          lng,
          color: color,
          size: size,
          temp: scaledTemp,
          _type: 'heat'
        })
      }
    }
    
    console.log(`🔥 Total points: ${points.length}/${totalPoints}`)
    console.log(`🔥 Temperature range: ${(minTemp*100).toFixed(0)}% - ${(maxTemp*100).toFixed(0)}%`)
    setHeatPoints(points)
    
  }, [activeSignals, signalIntensity])

  // Animation loop for time updates
  useEffect(() => {
    if (!activeSignals.has('heat')) return
    
    // Update every 500ms for smooth animation
    const interval = setInterval(() => {
      const time = Date.now() / 1000
      const intensity = signalIntensity.heat ?? 1.0
      
      setHeatPoints(prev => {
        if (!activeSignals.has('heat')) return []
        
        // Only update if intensity changed or every 2 seconds
        return prev.map(p => {
          const temp = getTemperature(p.lat, p.lng, time)
          const scaledTemp = temp * intensity
          const color = getThermalColor(scaledTemp)
          
          return {
            ...p,
            color: color,
            temp: scaledTemp
          }
        })
      })
    }, 500)
    
    return () => clearInterval(interval)
  }, [activeSignals, signalIntensity])

  // Globe ready handler
  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current
    if (!globe) return

    console.log('🌍 Globe ready')

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

    startTimeRef.current = performance.now()

    const animate = () => {
      if (cloudsRef.current?.mesh) {
        cloudsRef.current.mesh.rotation.y += 0.00055
      }
      
      const controls = globe.controls?.()
      if (controls?.update) {
        controls.update()
      }
      
      rafRef.current = requestAnimationFrame(animate)
    }
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
    
  }, [])

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
    }
  }, [])

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

  // Build HTML elements
  const buildSignalEl = useCallback(
    (d) => buildSignalHotspot(d, d._sigId, d._intensity ?? 1.0),
    []
  )

  const buildLocationPinEl = useCallback(
    (d) => buildLocationPin(d, { setActiveRegion, flyTo }),
    [setActiveRegion, flyTo]
  )

  // ✅ MOSAIC STYLE HEAT POINT - SMALL, NO GLOW
  const buildHeatPoint = useCallback((d) => {
    const div = document.createElement('div')
    div.style.cssText = `
      width: ${d.size}px;
      height: ${d.size}px;
      border-radius: 50%;
      background: ${d.color};
      pointer-events: none;
      transform: translate(-50%, -50%);
      box-shadow: none;
      transition: none;
    `
    return div
  }, [])

  const buildHtmlElement = useCallback((d) => {
    if (d._type === 'signal') return buildSignalEl(d)
    if (d._type === 'location') return buildLocationPinEl(d)
    if (d.color) return buildHeatPoint(d)
    return null
  }, [buildSignalEl, buildLocationPinEl, buildHeatPoint])

  // Combine all HTML data
  const combinedHtmlData = useMemo(() => {
    return [...allHtmlData, ...heatPoints]
  }, [allHtmlData, heatPoints])

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
        htmlElementsData={combinedHtmlData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={(d) => d.color ? 0.001 : (d._type === 'signal' ? 0.012 : 0.01)}
        htmlElement={buildHtmlElement}
        ringsData={[]}
        arcsData={[]}
        onGlobeReady={handleGlobeReady}
      />
      <style>{SIGNAL_ANIMATION_STYLES}</style>
    </div>
  )
}