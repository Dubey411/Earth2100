/**
 * SeaSurfaceTemperature.jsx — Equatorial Pacific SST Anomaly Layer.
 *
 * Uses a custom ShaderMaterial with a multi-stop color gradient:
 *   Deep Blue → Light Blue → Green → Yellow → Orange → Red.
 * Confined strictly to the Equatorial Pacific region with smooth Gaussian edge fades.
 *
 * Radius: 100.12 (just above Earth's surface 100.0)
 * Opacity: Moves 0.0 → 0.65
 */
import { useEffect } from 'react'
import * as THREE from 'three'

const SST_RADIUS = 100.12
const FADE_IN_MS = 1000
const FADE_OUT_MS = 600

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;

  uniform float uOpacity;
  uniform float uWarmCenter; // [0, 1] maps West Pacific (0) to East Pacific (1)

  varying vec2 vUv;

  void main() {
    float lat = (0.5 - vUv.y) * 180.0;
    float lng = (vUv.x - 0.5) * 360.0;

    // Equatorial Pacific boundaries: lat [-12, 12]
    float latWeight = smoothstep(12.0, 0.0, abs(lat));
    if (latWeight < 0.01) discard;

    // Map longitude to normalized Pacific coords: 120E (0.0) to 80W / -80E (1.0)
    float normLng = 0.0;
    if (lng >= 120.0) {
      normLng = (lng - 120.0) / 160.0;
    } else if (lng <= -80.0) {
      normLng = (lng + 360.0 - 120.0) / 160.0;
    } else {
      discard;
    }

    if (normLng < 0.0 || normLng > 1.0) discard;

    // Smooth horizontal edge fade
    float lngWeight = smoothstep(0.0, 0.12, normLng) * smoothstep(1.0, 0.88, normLng);
    float totalWeight = latWeight * lngWeight;
    if (totalWeight < 0.01) discard;

    // Normal pool (West, 0.12 center) vs El Nino pool (East, 0.78 center)
    float center = mix(0.12, 0.78, uWarmCenter);
    float distToWarm = abs(normLng - center);
    float warmIntensity = exp(-(distToWarm * distToWarm) / 0.045);

    // Baseline temperature (upwelling makes East cooler normally)
    float baseTemp = mix(0.68, 0.22, normLng); // warm in west, cool in east
    // During El Nino, eastern upwelling stops, warming the east
    baseTemp = mix(baseTemp, mix(0.55, 0.58, normLng), uWarmCenter);

    float finalTemp = clamp(baseTemp + warmIntensity * 0.60, 0.0, 1.0);

    // Temperature color scale mapping
    vec3 cDeepBlue  = vec3(0.02, 0.08, 0.45); // cool deep ocean
    vec3 cLightBlue = vec3(0.10, 0.45, 0.82);
    vec3 cGreen     = vec3(0.08, 0.65, 0.38);
    vec3 cYellow    = vec3(0.92, 0.82, 0.18);
    vec3 cOrange    = vec3(0.95, 0.45, 0.08);
    vec3 cRed       = vec3(0.88, 0.10, 0.05); // warm anomaly

    vec3 color;
    if (finalTemp < 0.2) {
      color = mix(cDeepBlue, cLightBlue, finalTemp / 0.2);
    } else if (finalTemp < 0.4) {
      color = mix(cLightBlue, cGreen, (finalTemp - 0.2) / 0.2);
    } else if (finalTemp < 0.6) {
      color = mix(cGreen, cYellow, (finalTemp - 0.4) / 0.2);
    } else if (finalTemp < 0.8) {
      color = mix(cYellow, cOrange, (finalTemp - 0.6) / 0.2);
    } else {
      color = mix(cOrange, cRed, (finalTemp - 0.8) / 0.2);
    }

    gl_FragColor = vec4(color, totalWeight * uOpacity * 0.65);
  }
`

export default function SeaSurfaceTemperature({ scene, registerAnimated }) {
  useEffect(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uOpacity:    { value: 0.0 },
        uWarmCenter: { value: 0.0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
      side:        THREE.FrontSide,
    })

    const geo  = new THREE.SphereGeometry(SST_RADIUS, 128, 64)
    const mesh = new THREE.Mesh(geo, material)
    mesh.rotation.y    = -Math.PI / 2
    mesh.frustumCulled = false
    mesh.renderOrder   = 10

    // Set identification metadata for Raycaster click
    mesh.userData = {
      ensoType: 'sst',
      name: 'Equatorial Sea Surface Temperature (SST)',
      desc: 'Visualizes water temperature across the Pacific. In normal states, strong trade winds push warm water west (Indonesia). In El Niño, this warm pool expands and shifts eastward to Peru.'
    }

    scene.add(mesh)

    const startMs = performance.now()

    const unregister = registerAnimated((ensoTime) => {
      // Fade in/out
      const elapsed = performance.now() - startMs
      material.uniforms.uOpacity.value = Math.min(elapsed / FADE_IN_MS, 1.0)

      // Timeline mapping for warm center [0, 1]
      // 0.0s – 4.0s: Normal (0.0 center)
      // 4.0s – 10.0s: Moving East (0.0 → 1.0)
      // 10.0s – 18.0s: El Nino Peak (1.0 center)
      // 18.0s – 24.0s: Retracting West (1.0 → 0.0)
      let warmVal = 0.0
      if (ensoTime >= 4.0 && ensoTime < 10.0) {
        warmVal = (ensoTime - 4.0) / 6.0
      } else if (ensoTime >= 10.0 && ensoTime < 18.0) {
        warmVal = 1.0
      } else if (ensoTime >= 18.0 && ensoTime < 24.0) {
        warmVal = 1.0 - (ensoTime - 18.0) / 6.0
      }

      // Smooth step ease for natural fluid motion
      const easedWarmVal = THREE.MathUtils.smoothstep(warmVal, 0.0, 1.0)
      material.uniforms.uWarmCenter.value = easedWarmVal
    })

    return () => {
      unregister()
      const fadeStart = performance.now()
      const curOpacity = material.uniforms.uOpacity.value
      const fadeOut = () => {
        const p = (performance.now() - fadeStart) / FADE_OUT_MS
        if (p < 1.0) {
          material.uniforms.uOpacity.value = curOpacity * (1.0 - p)
          requestAnimationFrame(fadeOut)
        } else {
          scene.remove(mesh)
          geo.dispose()
          material.dispose()
        }
      }
      requestAnimationFrame(fadeOut)
    }
  }, [scene]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
