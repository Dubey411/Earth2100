import { useRef, useEffect } from 'react'
import * as THREE from 'three'

// ============================================================
// HEAT MAP FUNCTIONS
// ============================================================

function getTemperature(lat, lng, time) {
  let temp = Math.cos(lat * Math.PI / 180) * 0.7 + 0.3
  
  // Ocean currents
  const gulf = Math.exp(-Math.pow((lat - 30) / 8, 2) - Math.pow((lng + 75) / 10, 2))
  temp += gulf * 0.15
  
  const kuro = Math.exp(-Math.pow((lat - 30) / 8, 2) - Math.pow((lng - 135) / 10, 2))
  temp += kuro * 0.12
  
  // Land effect
  const absLat = Math.abs(lat)
  const isLand = !(
    (lng > -130 && lng < -70 && absLat < 40) ||
    (lng > 150 && lng < 170 && absLat < 20) ||
    (lng > -60 && lng < -10 && absLat < 50) ||
    (lng > 70 && lng < 100 && absLat < 30)
  )
  
  if (isLand) {
    temp += 0.08
    const sahara = Math.exp(-Math.pow((lat - 23) / 10, 2) - Math.pow((lng - 10) / 15, 2))
    temp += sahara * 0.25
    const arabia = Math.exp(-Math.pow((lat - 25) / 8, 2) - Math.pow((lng - 45) / 10, 2))
    temp += arabia * 0.22
  }
  
  return Math.max(0, Math.min(1, temp))
}

function getThermalColor(t) {
  const s = Math.max(0, Math.min(1, t))
  
  const colors = [
    [0.00, 0.00, 0.60],
    [0.00, 0.15, 0.95],
    [0.00, 0.60, 0.95],
    [0.00, 0.85, 0.85],
    [0.00, 0.90, 0.40],
    [0.60, 0.95, 0.00],
    [0.95, 0.95, 0.00],
    [0.95, 0.60, 0.00],
    [0.90, 0.20, 0.00],
    [0.70, 0.00, 0.00]
  ]
  
  const idx = s * 9
  const i = Math.min(Math.floor(idx), 8)
  const frac = Math.min(idx - i, 1)
  const f = frac * frac * (3 - 2 * frac)
  
  const c1 = colors[i]
  const c2 = colors[Math.min(i + 1, 9)]
  
  return [
    (c1[0] + (c2[0] - c1[0]) * f) * 255,
    (c1[1] + (c2[1] - c1[1]) * f) * 255,
    (c1[2] + (c2[2] - c1[2]) * f) * 255
  ]
}

// ============================================================
// CANVAS HEAT MAP - EARTH ONLY
// ============================================================

export default function HeatMapCanvas({ 
  active, 
  intensity = 1.0,
  width = 2048,
  height = 1024
}) {
  const canvasRef = useRef(null)
  const imageDataRef = useRef(null)
  const animationRef = useRef(null)
  const timeRef = useRef(0)

  const generateHeatMap = (canvas, time) => {
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    
    let imageData = imageDataRef.current
    if (!imageData || imageData.width !== w || imageData.height !== h) {
      imageData = ctx.createImageData(w, h)
      imageDataRef.current = imageData
    }
    
    const data = imageData.data
    
    // Clear everything first (transparent)
    data.fill(0)
    
    // Only draw within Earth sphere
    const centerX = w / 2
    const centerY = h / 2
    const radius = Math.min(w, h) * 0.42 // Earth radius in canvas
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Calculate distance from center
        const dx = x - centerX
        const dy = y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // Skip if outside Earth sphere
        if (dist > radius) continue
        
        // Convert pixel to lat/lng (equirectangular projection)
        const lng = (x / w) * 360 - 180
        const lat = 90 - (y / h) * 180
        
        // Calculate temperature
        const temp = getTemperature(lat, lng, time)
        const scaledTemp = temp * intensity
        
        // Skip very cold areas
        if (scaledTemp < 0.05) continue
        
        // Get color
        const [r, g, b] = getThermalColor(scaledTemp)
        const alpha = Math.min(255, 200 * intensity)
        
        const idx = (y * w + x) * 4
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        data[idx + 3] = alpha
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
  }

  // Update canvas when active or intensity changes
  useEffect(() => {
    if (!active) {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const time = Date.now() / 1000
    generateHeatMap(canvas, time)
    timeRef.current = time

    const animate = () => {
      const newTime = Date.now() / 1000
      if (newTime - timeRef.current > 2) {
        generateHeatMap(canvas, newTime)
        timeRef.current = newTime
      }
      animationRef.current = requestAnimationFrame(animate)
    }
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [active, intensity])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: active ? 1 : 0,
        transition: 'opacity 0.5s ease',
        mixBlendMode: 'screen',
        zIndex: 10,
        borderRadius: '50%', // Makes it circular
        maskImage: 'radial-gradient(circle at center, black 40%, transparent 45%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 45%)',
      }}
    />
  )
}