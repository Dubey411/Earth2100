import * as THREE from 'three'

// ============================================================
// TEMPERATURE FUNCTIONS
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
// CREATE HEAT MAP TEXTURE
// ============================================================

export function createHeatMapTexture(width = 2048, height = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data
  const time = Date.now() / 1000
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const lng = (x / width) * 360 - 180
      const lat = 90 - (y / height) * 180
      
      const temp = getTemperature(lat, lng, time)
      
      // Skip very cold areas
      if (temp < 0.05) {
        const idx = (y * width + x) * 4
        data[idx] = 0
        data[idx + 1] = 0
        data[idx + 2] = 0
        data[idx + 3] = 0
        continue
      }
      
      const [r, g, b] = getThermalColor(temp)
      const alpha = 200
      
      const idx = (y * width + x) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = alpha
    }
  }
  
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

// ============================================================
// CREATE HEAT MAP MESH (FOR Globe.customLayer)
// ============================================================

export function createHeatMapMesh(intensity = 1.0) {
  console.log('🔥 Creating heat map mesh...')
  
  // Create heat map texture
  const canvas = createHeatMapTexture()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  
  // Create material
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: intensity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  
  // Create mesh (slightly larger than Earth)
  const geometry = new THREE.SphereGeometry(1.008, 64, 64)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.visible = true
  mesh.renderOrder = 5
  
  console.log('🔥 Heat map mesh created!')
  
  return {
    mesh,
    material,
    texture,
    update: (newIntensity) => {
      material.opacity = newIntensity
    },
    updateTexture: () => {
      const newCanvas = createHeatMapTexture()
      const newTexture = new THREE.CanvasTexture(newCanvas)
      newTexture.colorSpace = THREE.SRGBColorSpace
      newTexture.anisotropy = 4
      material.map = newTexture
      material.needsUpdate = true
      // Dispose old texture
      if (texture) {
        texture.dispose()
      }
      return newTexture
    },
    dispose: () => {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    }
  }
}