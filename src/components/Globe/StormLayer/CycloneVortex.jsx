/**
 * StormLayer/CycloneVortex.jsx
 *
 * GPU-driven spinning particle vortex for each tropical cyclone.
 *
 * Each vortex has:
 *   - 600 particles per storm arranged in spiraling arms
 *   - Particles orbit the eye at varying speeds (inner faster, outer slower)
 *   - Color gradient from white core → category color → transparent edge
 *   - Eye wall: dark void at storm center (cutout in fragment shader)
 *   - Altitude: radius 100.5 (just above ocean surface)
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { catToColor } from './constants'

const GLOBE_R    = 100.5
const PER_STORM  = 600
const FADE_MS    = 1200

const VERT = /* glsl */`
  attribute float aAngle;      // initial orbital angle
  attribute float aOrbitR;     // orbital radius (normalized 0–1 relative to storm radius)
  attribute float aArmPhase;   // which spiral arm (0 or 1 for two-arm spiral)
  attribute float aSpeed;      // individual orbit speed multiplier

  uniform float uTime;
  uniform float uOpacity;
  uniform float uGlobeR;
  uniform float uStormLat;   // degrees
  uniform float uStormLng;   // degrees
  uniform float uStormR;     // storm radius in degrees (approx)
  uniform float uRotDir;     // +1 = counter-clockwise (NH), -1 = clockwise (SH)

  varying float vAlpha;
  varying float vOrbitFrac;

  const float PI = 3.14159265;

  // Convert lat/lng in degrees to unit sphere position (un-rotated)
  vec3 latLngToRaw(float lat, float lng) {
    float phi   = (90.0 - lat) * PI / 180.0;
    float theta = (90.0 - lng) * PI / 180.0;
    return vec3(sin(phi)*cos(theta), cos(phi), sin(phi)*sin(theta));
  }

  // Apply globe's Y rotation (-PI/2) to align with react-globe.gl
  vec3 applyGlobeRot(vec3 p) {
    return vec3(-p.z, p.y, p.x);
  }

  void main() {
    // Spiral arm offset: logarithmic spiral r = a * e^(b * angle)
    float armOffset = aArmPhase * PI; // 0 or PI for two arms
    float baseAngle  = aAngle + armOffset;

    // Orbital speed: inner particles orbit faster
    float orbitSpeed = uRotDir * (1.2 + (1.0 - aOrbitR) * 4.0) * aSpeed;
    float angle = baseAngle + uTime * orbitSpeed;

    // Local storm coordinates (flat approximation in degrees)
    // Logarithmic spiral: r = stormR * aOrbitR^1.4
    float localR = uStormR * pow(aOrbitR, 1.30);
    float dLng   = localR * cos(angle) / cos(uStormLat * PI / 180.0);
    float dLat   = localR * sin(angle);

    float lat = uStormLat + dLat;
    float lng = uStormLng + dLng;

    vec3 rawPos = latLngToRaw(lat, lng);
    vec3 pos    = applyGlobeRot(rawPos) * uGlobeR;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    // Size: larger near edge, smaller in center
    gl_PointSize = mix(1.5, 3.8, aOrbitR * 0.75 + 0.25);

    // Alpha: fade eye wall cutout + outer edge fade
    float eyeFade  = smoothstep(0.0, 0.16, aOrbitR);         // dark eye
    float edgeFade = 1.0 - smoothstep(0.70, 1.0, aOrbitR);   // fade outer edge
    vAlpha      = eyeFade * edgeFade * uOpacity;
    vOrbitFrac  = aOrbitR;
  }
`

const FRAG = /* glsl */`
  precision mediump float;
  uniform vec3  uColor;    // category color
  varying float vAlpha;
  varying float vOrbitFrac;

  void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float d = length(coord);
    if (d > 0.5) discard;

    float glow = smoothstep(0.5, 0.1, d);

    // Color: white inner core → category color mid → transparent edge
    vec3 col = mix(vec3(1.0, 1.0, 1.0), uColor, smoothstep(0.10, 0.55, vOrbitFrac));

    gl_FragColor = vec4(col, glow * vAlpha);
  }
`

export default function CycloneVortex({ scene, storm, globalTime, registerAnimated }) {
  const pointsRef = useRef(null)

  useEffect(() => {
    const count = PER_STORM
    const angles     = new Float32Array(count)
    const orbitRs    = new Float32Array(count)
    const armPhases  = new Float32Array(count)
    const speeds     = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      angles[i]    = Math.random() * Math.PI * 2
      // Distribute most particles in the inner-to-mid band (0.1–0.95)
      orbitRs[i]   = 0.10 + Math.pow(Math.random(), 0.6) * 0.88
      armPhases[i] = Math.floor(Math.random() * 3) * (Math.PI * 2 / 3) // 3-arm spiral
      speeds[i]    = 0.75 + Math.random() * 0.5
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',   new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aAngle',     new THREE.BufferAttribute(angles, 1))
    geo.setAttribute('aOrbitR',    new THREE.BufferAttribute(orbitRs, 1))
    geo.setAttribute('aArmPhase',  new THREE.BufferAttribute(armPhases, 1))
    geo.setAttribute('aSpeed',     new THREE.BufferAttribute(speeds, 1))

    const catColor = new THREE.Color(catToColor(storm.cat))
    const rotDir   = storm.lat >= 0 ? -1.0 : 1.0  // CCW in NH, CW in SH

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:      { value: 0 },
        uOpacity:   { value: 0 },
        uGlobeR:    { value: GLOBE_R },
        uStormLat:  { value: storm.lat },
        uStormLng:  { value: storm.lng },
        uStormR:    { value: storm.radius },
        uRotDir:    { value: rotDir },
        uColor:     { value: catColor },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    pts.renderOrder   = 20
    pts.userData = {
      stormType: 'vortex',
      stormId:   storm.id,
      name:      storm.name,
      desc:      `${storm.name} — Category ${storm.cat} tropical cyclone. Maximum sustained winds exceed ${storm.cat >= 4 ? '130' : storm.cat >= 3 ? '111' : '74'} mph. Storm surge and extreme rainfall threaten coastal communities.`
    }

    scene.add(pts)
    pointsRef.current = pts

    const startMs = performance.now()
    const unregister = registerAnimated((t) => {
      const elapsed = (performance.now() - startMs) / FADE_MS
      mat.uniforms.uOpacity.value = Math.min(elapsed, 1.0) * storm.intensity
      mat.uniforms.uTime.value    = t
    })

    return () => {
      unregister()
      const fade = () => {
        mat.uniforms.uOpacity.value -= 0.04
        if (mat.uniforms.uOpacity.value > 0) { requestAnimationFrame(fade) }
        else { scene.remove(pts); geo.dispose(); mat.dispose() }
      }
      fade()
    }
  }, [scene, storm]) // eslint-disable-line

  return null
}
