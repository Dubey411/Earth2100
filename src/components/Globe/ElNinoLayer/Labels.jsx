/**
 * Labels.jsx — Floating 2D HUD Annotations for the Walker Circulation.
 *
 * Projects 3D globe positions to 2D screen coordinates each frame,
 * then renders React DOM labels (no CSS2DRenderer required).
 *
 * Labels:
 *   - "Warm Pool" (shifts West → East during El Niño)
 *   - "Cold Upwelling" (Peru coast — fades during El Niño)
 *   - "LOW Pressure" (tracks warm pool)
 *   - "HIGH Pressure" (tracks cold side)
 *   - Phase Banner in top-left corner
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const LABEL_RADIUS = 104

function latLngTo3D(lat, lng, r = LABEL_RADIUS) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (90 - lng) * Math.PI / 180
  const x = r * Math.sin(phi) * Math.cos(theta)
  const y = r * Math.cos(phi)
  const z = r * Math.sin(phi) * Math.sin(theta)
  // Apply globe Y rotation = -PI/2
  return new THREE.Vector3(-z, y, x)
}

function projectToScreen(pos3D, camera, width, height) {
  const v = pos3D.clone().project(camera)
  // Only show if in front of camera
  if (v.z > 1.0) return null
  return {
    x: ((v.x + 1) / 2) * width,
    y: ((-v.y + 1) / 2) * height,
  }
}

const LABEL_DEFS = [
  {
    id: 'warm',
    getText: (f) => f > 0.85 ? 'El Niño Warm Pool' : f > 0.15 ? 'Warm Pool Shifting' : 'Warm Pool',
    getSub:  (f) => f > 0.85 ? 'Central/East Pacific' : f > 0.15 ? 'El Niño Developing' : 'Indonesia · ≥28°C',
    color: '#ff9240',
    getLat: ()    => 6,
    getLng: (f)   => THREE.MathUtils.lerp(140, -120, f),
  },
  {
    id: 'cold',
    getText: ()   => 'Cold Upwelling',
    getSub:  ()   => 'Peru Current · Shut Down↓',
    color: '#40c8ff',
    getLat: ()    => -8,
    getLng: ()    => -90,
    getOpacity: (f) => Math.max(0, 1.0 - f * 1.4),
  },
  {
    id: 'low',
    getText: ()   => 'LOW ↑',
    getSub:  ()   => 'Rising Warm Air',
    color: '#5b8fff',
    getLat: ()    => 4,
    getLng: (f)   => THREE.MathUtils.lerp(132, -115, f),
  },
  {
    id: 'high',
    getText: ()   => 'HIGH ↓',
    getSub:  ()   => 'Sinking Cool Air',
    color: '#ff8030',
    getLat: ()    => -4,
    getLng: (f)   => THREE.MathUtils.lerp(-80, 130, f),
  },
]

export default function Labels({ globe, scene, registerAnimated }) {
  const [labelPositions, setLabelPositions] = useState({})
  const [ninoFrac, setNinoFrac] = useState(0.0)
  const sizeRef = useRef({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const resize = () => {
      sizeRef.current = { w: window.innerWidth, h: window.innerHeight }
    }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    if (!globe) return

    const unregister = registerAnimated((ensoTime) => {
      const camera = globe.camera()
      if (!camera) return

      // Calculate El Niño fraction
      let frac = 0.0
      if (ensoTime >= 4.0 && ensoTime < 10.0) {
        frac = (ensoTime - 4.0) / 6.0
      } else if (ensoTime >= 10.0 && ensoTime < 18.0) {
        frac = 1.0
      } else if (ensoTime >= 18.0 && ensoTime < 24.0) {
        frac = 1.0 - (ensoTime - 18.0) / 6.0
      }
      const eased = THREE.MathUtils.smoothstep(frac, 0, 1)
      setNinoFrac(eased)

      const { w, h } = sizeRef.current
      const positions = {}

      LABEL_DEFS.forEach((def) => {
        const lat = def.getLat(eased)
        const lng = def.getLng(eased)
        const pos3D = latLngTo3D(lat, lng)
        const screen = projectToScreen(pos3D, camera, w, h)
        positions[def.id] = screen
      })

      setLabelPositions(positions)
    })

    return () => unregister()
  }, [globe, scene, registerAnimated])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 80 }}>
      {LABEL_DEFS.map((def) => {
        const pos = labelPositions[def.id]
        if (!pos) return null

        const opacity = def.getOpacity ? def.getOpacity(ninoFrac) : 1.0
        if (opacity <= 0.02) return null

        return (
          <div
            key={def.id}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              opacity,
              transition: 'opacity 0.4s',
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(3, 10, 22, 0.72)',
              borderRadius: '4px',
              padding: '3px 7px',
              border: `1px solid ${def.color}44`,
              backdropFilter: 'blur(4px)',
            }}>
              <span style={{
                color: def.color,
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                fontFamily: '"Outfit","Inter",sans-serif',
              }}>
                {def.getText(ninoFrac)}
              </span>
              <span style={{
                color: 'rgba(200,220,255,0.60)',
                fontSize: '7.5px',
                whiteSpace: 'nowrap',
                fontFamily: '"Outfit","Inter",sans-serif',
                marginTop: '1px',
              }}>
                {def.getSub(ninoFrac)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
