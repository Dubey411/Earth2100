import * as THREE from 'three'
import worldCountries from '../../data/countries.geo.json'

export function createLandMaskTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 4096
  canvas.height = 2048

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5

  const drawPolygon = (coords) => {
    ctx.beginPath()
    coords.forEach((pt, idx) => {
      const x = (pt[0] + 180) * (canvas.width / 360)
      const y = (90 - pt[1]) * (canvas.height / 180)
      if (idx === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fill()
  }

  const features = worldCountries?.features ?? []
  features.forEach((feature) => {
    const geom = feature.geometry
    if (!geom) return
    if (geom.type === 'Polygon') geom.coordinates.forEach(drawPolygon)
    else if (geom.type === 'MultiPolygon') geom.coordinates.forEach((p) => p.forEach(drawPolygon))
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  return texture
}
