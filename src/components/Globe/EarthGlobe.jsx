import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import Globe from 'react-globe.gl'
import * as THREE from 'three'
import { HOTSPOTS } from '../../data/hotspots.js'
import useClimateStore from '../../store/useClimateStore.js'
import worldCountries from '../../../geojson/world.geo.json/countries.geo.json'

const geojsonModules = import.meta.glob('../../../geojson/**/*.geo.json', { eager: true })

/* ─── Texture URLs ──────────────────────────────────────────────────────── */
const EARTH_DAY   = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
const EARTH_NIGHT = 'https://unpkg.com/three-globe/example/img/earth-night.jpg'
const EARTH_BUMP  = 'https://unpkg.com/three-globe/example/img/earth-topology.png'
const CLOUD_IMG   = 'https://unpkg.com/three-globe/example/img/earth-water.png'

/* ═══════════════════════════════════════════════════════════════════════════
   NON-HEAT SIGNAL HOTSPOT DATA
   Heat Stress is rendered via a custom GLSL ShaderMaterial — no markers.
═══════════════════════════════════════════════════════════════════════════ */
const SIGNAL_HOTSPOT_DATA = {
  flood: [
    { id: 'fl-bang',   lat: 23.7, lng: 90.4, label: 'Bangladesh',      radius: 44, c1: '#0066ff', c2: '#3399ff', c3: '#4da6ff' },
    { id: 'fl-pak',    lat: 30,   lng: 70,   label: 'Pakistan',        radius: 40, c1: '#0066ff', c2: '#3399ff', c3: '#4da6ff' },
    { id: 'fl-india',  lat: 20,   lng: 85,   label: 'Eastern India',   radius: 42, c1: '#0066ff', c2: '#3399ff', c3: '#4da6ff' },
    { id: 'fl-neth',   lat: 52.3, lng: 5.3,  label: 'Netherlands',     radius: 32, c1: '#3399ff', c2: '#4da6ff', c3: '#80c0ff' },
    { id: 'fl-miss',   lat: 36,   lng: -90,  label: 'Mississippi',     radius: 38, c1: '#0066ff', c2: '#3399ff', c3: '#4da6ff' },
  ],
  wildfire: [
    { id: 'wf-ca',     lat: 38.5, lng: -121, label: 'California',      radius: 40, c1: '#ff2200', c2: '#ff4500', c3: '#ff6b35' },
    { id: 'wf-can',    lat: 54,   lng: -115, label: 'Canada',          radius: 46, c1: '#ff2200', c2: '#ff4500', c3: '#ff6b35' },
    { id: 'wf-aus',    lat: -32,  lng: 148,  label: 'Australia',       radius: 48, c1: '#ff2200', c2: '#ff4500', c3: '#ff6b35' },
    { id: 'wf-med',    lat: 39,   lng: 22,   label: 'Mediterranean',   radius: 38, c1: '#ff4500', c2: '#ff6b35', c3: '#ffa07a' },
    { id: 'wf-sib',    lat: 62,   lng: 105,  label: 'Siberia',         radius: 44, c1: '#ff2200', c2: '#ff4500', c3: '#ff6b35' },
  ],
  drought: [
    { id: 'dr-hoa',    lat: 10,   lng: 42,   label: 'Horn of Africa',  radius: 54, c1: '#a0522d', c2: '#b5651d', c3: '#cd853f' },
    { id: 'dr-amz',    lat: -6,   lng: -63,  label: 'Amazon',          radius: 48, c1: '#a0522d', c2: '#b5651d', c3: '#cd853f' },
    { id: 'dr-raj',    lat: 27,   lng: 72,   label: 'Rajasthan',       radius: 40, c1: '#a0522d', c2: '#b5651d', c3: '#cd853f' },
    { id: 'dr-chile',  lat: -28,  lng: -70,  label: 'Chile',           radius: 36, c1: '#a0522d', c2: '#b5651d', c3: '#cd853f' },
  ],
  cryo: [
    { id: 'cr-arctic', lat: 82,   lng: 0,    label: 'Arctic',          radius: 68, c1: '#00ffff', c2: '#66ffff', c3: '#aaffff' },
    { id: 'cr-green',  lat: 72,   lng: -40,  label: 'Greenland',       radius: 56, c1: '#00ffff', c2: '#66ffff', c3: '#aaffff' },
    { id: 'cr-ant',    lat: -80,  lng: 0,    label: 'Antarctica',      radius: 72, c1: '#00ffff', c2: '#66ffff', c3: '#aaffff' },
  ],
  air: [
    { id: 'ai-delhi',  lat: 28.7, lng: 77.1, label: 'Delhi',           radius: 38, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
    { id: 'ai-beijing',lat: 39.9, lng: 116.4,label: 'Beijing',         radius: 36, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
    { id: 'ai-lahore', lat: 31.5, lng: 74.3, label: 'Lahore',          radius: 34, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
    { id: 'ai-mexico', lat: 19.4, lng: -99,  label: 'Mexico City',     radius: 36, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
    { id: 'ai-jakarta',lat: -6,   lng: 107,  label: 'Jakarta',         radius: 34, c1: '#8a2be2', c2: '#9370db', c3: '#b07edb' },
  ],
  forest: [
    { id: 'fo-amz',    lat: -5,   lng: -60,  label: 'Amazon',          radius: 60, c1: '#cc0000', c2: '#ff0000', c3: '#ff4444' },
    { id: 'fo-ind',    lat: 0,    lng: 115,  label: 'Indonesia',       radius: 48, c1: '#cc0000', c2: '#ff0000', c3: '#ff4444' },
    { id: 'fo-congo',  lat: 0,    lng: 24,   label: 'Congo',           radius: 50, c1: '#cc0000', c2: '#ff0000', c3: '#ff4444' },
  ],
  sealevel: [
    { id: 'sl-mum',    lat: 18.9, lng: 72.8, label: 'Mumbai',          radius: 30, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-jak',    lat: -6.2, lng: 106.8,label: 'Jakarta',         radius: 30, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-mia',    lat: 25.8, lng: -80.2,label: 'Miami',           radius: 28, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-ven',    lat: 45.4, lng: 12.3, label: 'Venice',          radius: 26, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-bang',   lat: 22.3, lng: 91.8, label: 'Bangladesh Coast',radius: 28, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
    { id: 'sl-male',   lat: 4.2,  lng: 73.5, label: 'Maldives',        radius: 22, c1: '#00bfff', c2: '#00ffff', c3: '#80ffff' },
  ],
  enso: [
    { id: 'en-c',      lat: 0,    lng: -150, label: 'Central Pacific', radius: 70, c1: '#ff8c00', c2: '#ffb347', c3: '#ffd700' },
    { id: 'en-e',      lat: 0,    lng: -110, label: 'East Pacific',    radius: 60, c1: '#ff6600', c2: '#ff8c00', c3: '#ffb347' },
    { id: 'en-w',      lat: 5,    lng: -175, label: 'West Pacific',    radius: 56, c1: '#ff8c00', c2: '#ffb347', c3: '#ffd700' },
    { id: 'en-ni',     lat: -5,   lng: -160, label: 'Niño 3.4',        radius: 64, c1: '#ff5c00', c2: '#ff8c00', c3: '#ffb347' },
  ],
  storm: [
    { id: 'st-phil',   lat: 18,   lng: 125,  label: 'Philippines',     radius: 36, c1: '#cc66ff', c2: '#dd88ff', c3: '#eeb0ff' },
    { id: 'st-gulf',   lat: 24,   lng: -88,  label: 'Gulf of Mexico',  radius: 34, c1: '#cc66ff', c2: '#dd88ff', c3: '#eeb0ff' },
    { id: 'st-ind',    lat: -15,  lng: 88,   label: 'Indian Ocean',    radius: 32, c1: '#cc66ff', c2: '#dd88ff', c3: '#eeb0ff' },
    { id: 'st-ecs',    lat: 28,   lng: 130,  label: 'East China Sea',  radius: 32, c1: '#cc66ff', c2: '#dd88ff', c3: '#eeb0ff' },
  ],
}

const ANIM_TYPE = {
  flood:'ripple', wildfire:'flicker', drought:'diffuse',
  cryo:'breathe', air:'haze', forest:'blink',
  sealevel:'coast', enso:'current', storm:'spin',
}
const BASE_OPACITY = {
  flood:0.25, wildfire:0.40, drought:0.20, cryo:0.30,
  air:0.25, forest:0.30, sealevel:0.30, enso:0.25, storm:0.35,
}

/* ─── Build a hotspot DOM element (non-heat signals) ────────────────────── */
function buildSignalHotspot(hp, signalId, intensity) {
  const anim   = ANIM_TYPE[signalId] || 'pulse'
  const opBase = (BASE_OPACITY[signalId] ?? 0.3) * intensity
  const r      = hp.radius

  const wrap = document.createElement('div')
  wrap.style.cssText = `position:relative;width:${r*2}px;height:${r*2}px;pointer-events:auto;cursor:crosshair;`

  const halo = document.createElement('div')
  halo.style.cssText = `
    position:absolute;left:50%;top:50%;width:${r*2.8}px;height:${r*2.8}px;
    border-radius:50%;transform:translate(-50%,-50%);
    background:radial-gradient(circle,${hp.c2}${Math.round(opBase*0.38*255).toString(16).padStart(2,'0')} 0%,${hp.c3}0a 50%,transparent 75%);
    filter:blur(${r*0.45}px);pointer-events:none;mix-blend-mode:screen;
  `
  wrap.appendChild(halo)

  const fill = document.createElement('div')
  fill.style.cssText = `
    position:absolute;left:50%;top:50%;width:${r*2}px;height:${r*2}px;
    border-radius:50%;transform:translate(-50%,-50%);
    background:radial-gradient(circle,
      ${hp.c1}${Math.round(opBase*0.92*255).toString(16).padStart(2,'0')} 0%,
      ${hp.c2}${Math.round(opBase*0.55*255).toString(16).padStart(2,'0')} 38%,
      ${hp.c3}${Math.round(opBase*0.18*255).toString(16).padStart(2,'0')} 68%,transparent 100%);
    filter:blur(${r*0.18}px);pointer-events:none;mix-blend-mode:screen;
    animation:sig-${anim} ${anim==='ripple'?2.2:anim==='breathe'?3.5:1.5}s ease-in-out infinite;
  `
  wrap.appendChild(fill)

  const numRings = anim==='breathe'?0:anim==='coast'?3:2
  for (let i=0; i<numRings; i++) {
    const ring = document.createElement('div')
    ring.style.cssText = `
      position:absolute;left:50%;top:50%;width:${r*1.1}px;height:${r*1.1}px;
      border-radius:50%;border:${anim==='coast'?1.5:2}px solid ${hp.c2};
      transform:translate(-50%,-50%) scale(0.5);
      pointer-events:none;mix-blend-mode:screen;opacity:0;
      animation:sig-ring-${anim} ${anim==='ripple'?2.2:anim==='coast'?3.0:1.8}s ease-out infinite ${i*(anim==='ripple'?0.9:anim==='coast'?1.1:0.7)}s;
    `
    wrap.appendChild(ring)
  }

  const dot = document.createElement('div')
  const dotR = Math.max(4, r*0.10)
  dot.style.cssText = `
    position:absolute;left:50%;top:50%;width:${dotR*2}px;height:${dotR*2}px;
    border-radius:50%;background:${hp.c1};transform:translate(-50%,-50%);
    box-shadow:0 0 ${dotR*1.5}px ${hp.c1},0 0 ${dotR*3}px ${hp.c2},0 0 ${dotR*5}px ${hp.c3}55;
    pointer-events:none;mix-blend-mode:screen;
    animation:sig-dot-${anim} ${anim==='blink'?1.2:anim==='flicker'?0.4:1.8}s ease-in-out infinite;
  `
  wrap.appendChild(dot)

  const tip = document.createElement('div')
  tip.style.cssText = `
    position:absolute;left:50%;bottom:calc(100% + ${dotR+8}px);min-width:120px;
    transform:translateX(-50%) translateY(4px);padding:6px 10px;
    background:rgba(2,6,17,0.93);border:1px solid ${hp.c2}66;border-radius:10px;
    backdrop-filter:blur(16px);opacity:0;pointer-events:none;
    transition:opacity 0.18s,transform 0.18s;
    font-family:Inter,sans-serif;font-size:11px;font-weight:600;
    color:${hp.c2};white-space:nowrap;z-index:999;text-align:center;
    box-shadow:0 4px 20px rgba(0,0,0,0.7),0 0 12px ${hp.c1}33;
  `
  tip.textContent = hp.label
  wrap.appendChild(tip)
  wrap.addEventListener('mouseenter', ()=>{ tip.style.opacity='1';tip.style.transform='translateX(-50%) translateY(0)' })
  wrap.addEventListener('mouseleave', ()=>{ tip.style.opacity='0';tip.style.transform='translateX(-50%) translateY(4px)' })
  return wrap
}

/* ─── ENSO Arcs ─────────────────────────────────────────────────────────── */
const ENSO_ARCS = [
  { startLat:0, startLng:160, endLat:2,  endLng:-90, color:['rgba(255,140,0,0.8)','rgba(255,165,0,0.4)'] },
  { startLat:4, startLng:155, endLat:6,  endLng:-80, color:['rgba(255,120,0,0.7)','rgba(255,140,0,0.3)'] },
  { startLat:-4,startLng:165, endLat:-4, endLng:-95, color:['rgba(255,100,0,0.7)','rgba(255,120,0,0.3)'] },
  { startLat:8, startLng:150, endLat:8,  endLng:-75, color:['rgba(255,160,0,0.6)','rgba(255,190,0,0.2)'] },
]
const FLOOD_RINGS   = [{lat:23.7,lng:90.4},{lat:30,lng:70},{lat:20,lng:85},{lat:52.3,lng:5.3},{lat:36,lng:-90}]
const SEALEVEL_RINGS = [{lat:18.9,lng:72.8},{lat:-6.2,lng:106.8},{lat:25.8,lng:-80.2},{lat:45.4,lng:12.3},{lat:22.3,lng:91.8},{lat:4.2,lng:73.5}]


const HEAT_VERTEX = `
  varying vec3 vPos3D;
  varying vec2 vUv;
  void main() {
    vUv    = uv;
    vPos3D = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const HEAT_FRAGMENT = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uZoom;
  uniform sampler2D uMaskTex;
  varying vec3 vPos3D;
  varying vec2 vUv;

  /* ── Simplex 3-D noise ─────────────────────────────────── */
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
  vec4 tInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+2.0*C.xxx;
    vec3 x3=x0-D.yyy;
    i=mod(i,289.0);
    vec4 p=permute(permute(permute(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
      +i.y+vec4(0.0,i1.y,i2.y,1.0))
      +i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;
    vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=tInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  /* ── 5-octave fractional Brownian motion ───────────────── */
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 s = p;
    for (int i = 0; i < 5; i++) {
      v += a * snoise(s);
      s  = s * 2.1 + vec3(1.7, 9.2, 3.4);
      a *= 0.48;
    }
    return v;
  }

  /* ── 6-stop scientific temperature palette ─────────────── */
  /* ice-blue → steel-blue → cyan → yellow → orange → crimson */
  vec3 tempToColor(float t) {
    vec3 c0 = vec3(0.094, 0.212, 0.671); // arctic blue
    vec3 c1 = vec3(0.149, 0.545, 0.859); // cool steel-blue
    vec3 c2 = vec3(0.180, 0.835, 0.788); // cyan-teal
    vec3 c3 = vec3(0.992, 0.906, 0.145); // warm yellow
    vec3 c4 = vec3(1.000, 0.502, 0.000); // hot orange
    vec3 c5 = vec3(0.780, 0.043, 0.102); // extreme crimson
    float s = clamp(t, 0.0, 1.0);
    if      (s < 0.20) return mix(c0, c1, s / 0.20);
    else if (s < 0.40) return mix(c1, c2, (s - 0.20) / 0.20);
    else if (s < 0.60) return mix(c2, c3, (s - 0.40) / 0.20);
    else if (s < 0.80) return mix(c3, c4, (s - 0.60) / 0.20);
    else               return mix(c4, c5, (s - 0.80) / 0.20);
  }

  void main() {
    /* ── Land mask: discard ocean ──────────────────────── */
    float mask = texture2D(uMaskTex, vUv).r;
    if (mask < 0.05) discard;

    float lat = vUv.y * 180.0 - 90.0;    // -90 S … +90 N
    float lng = (vUv.x - 0.5) * 360.0;   // -180 … +180
    float t   = uTime * 0.007;

    /* ── Turbulent advection warp ───────────────────── */
    float wx = snoise(vec3(lng * 0.018, lat * 0.026, t        )) * 4.2;
    float wy = snoise(vec3(lng * 0.024 + 5.7, lat * 0.021, t * 0.85)) * 3.6;
    float qLat = lat + wy;
    float qLng = lng + wx;

    /* ── Latitude-based base heat ───────────────────── */
    /* Hottest at equator (absLat=0), coldest at poles (absLat=1) */
    float absLat  = abs(qLat) / 90.0;
    float latHeat = 1.0 - pow(absLat, 0.70);  // nonlinear: tropics burn

    /* ── Synoptic weather variation (large-scale) ───── */
    float synoptic = fbm(vec3(qLng * 0.020, qLat * 0.026, 2.3 + t)) * 0.28;

    /* ── Meso-scale anomaly pockets ─────────────────── */
    float pocket = smoothstep(0.52, 0.87,
      snoise(vec3(qLng * 0.13, qLat * 0.11, 9.5 + t * 1.25))
    ) * 0.30 * mix(0.5, 1.0, uIntensity);

    /* ── Combine and scale by intensity ─────────────── */
    float heat = clamp(latHeat + synoptic + pocket, 0.0, 1.0);
    heat = clamp(heat * (0.45 + 0.55 * uIntensity), 0.0, 1.0);

    /* ── Colour & opacity ────────────────────────────── */
    vec3  col = tempToColor(heat);
    float op  = mix(0.30, 0.72, heat) * uIntensity;
    gl_FragColor = vec4(col, op);
  }
`

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENT
 ════════════════════════════════════════════════════════════════════════════ */
export default function EarthGlobe() {
  const globeRef     = useRef(null)
  const cloudsRef    = useRef(null)
  const heatMeshRef  = useRef(null)
  const resumeRef    = useRef(null)
  const startTimeRef = useRef(0)
  const rafRef       = useRef(null)
  const controlsRef  = useRef(null)
  const containerRef = useRef(null)

  const [size,       setSize]       = useState({ w: window.innerWidth, h: window.innerHeight })
  const [isDragging, setIsDragging] = useState(false)

  const autoRotate      = useClimateStore((s) => s.autoRotate)
  const flyTarget       = useClimateStore((s) => s.flyTarget)
  const handToolActive  = useClimateStore((s) => s.handToolActive)
  const activeSignals   = useClimateStore((s) => s.activeSignals)
  const signalIntensity = useClimateStore((s) => s.signalIntensity)
  const setActiveRegion = useClimateStore((s) => s.setActiveRegion)
  const clearFlyTarget  = useClimateStore((s) => s.clearFlyTarget)
  const flyTo           = useClimateStore((s) => s.flyTo)

  /* ── Resize ── */
  useEffect(() => {
    const fn = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  /* ── Canvas Mask Texture (ALL world land) ── */
  const maskTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width  = 4096
    canvas.height = 2048
    const ctx = canvas.getContext('2d')

    // Ocean = black (discarded by shader), Land = white
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle   = '#ffffff'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth   = 1.5

    const drawPolygon = (coords) => {
      ctx.beginPath()
      coords.forEach((pt, idx) => {
        const x = (pt[0] + 180) * (canvas.width  / 360)
        const y = (90 - pt[1])  * (canvas.height / 180)
        if (idx === 0) ctx.moveTo(x, y)
        else           ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.fill()
    }

    // Use the already-imported full world GeoJSON (all 240+ countries)
    const features = worldCountries?.features ?? []
    features.forEach((feature) => {
      const geom = feature.geometry
      if (!geom) return
      if      (geom.type === 'Polygon')      geom.coordinates.forEach(drawPolygon)
      else if (geom.type === 'MultiPolygon') geom.coordinates.forEach((p) => p.forEach(drawPolygon))
    })

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.NoColorSpace
    return tex
  }, [])

  /* ── Globe ready ── */
  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current
    if (!globe) return

    const controls = globe.controls()
    if (controls) {
      controls.autoRotate      = useClimateStore.getState().autoRotate
      controls.autoRotateSpeed = 0.25
      controls.enablePan       = false
      controls.enableRotate    = useClimateStore.getState().handToolActive
      controls.enableDamping   = true
      controls.dampingFactor   = 0.05
      controls.minDistance     = 180
      controls.maxDistance     = 450

      let _drag = false
      const onStart = () => {
        _drag = true
        setIsDragging(true)
        clearTimeout(resumeRef.current)
        controls.autoRotate = false
      }
      const onEnd   = () => {
        _drag = false
        setIsDragging(false)
        clearTimeout(resumeRef.current)
        resumeRef.current = setTimeout(() => {
          if (useClimateStore.getState().autoRotate && !_drag) {
            controls.autoRotate = true
          }
        }, 3000)
      }
      controls.addEventListener('start', onStart)
      controls.addEventListener('end',   onEnd)
      controlsRef.current = { controls, onStart, onEnd }
    }

    globe.pointOfView({ lat: 20, lng: 70, altitude: 2.2 }, 0)

    const scene  = globe.scene()
    const loader = new THREE.TextureLoader()

    // Night lights (additive)
    loader.load(EARTH_NIGHT, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(101.2, 64, 64),
        new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.38, blending:THREE.AdditiveBlending, depthWrite:false })
      ))
    })

    // Clouds
    loader.load(CLOUD_IMG, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(102.2, 64, 64),
        new THREE.MeshLambertMaterial({ map:tex, transparent:true, opacity:0.30, depthWrite:false })
      )
      scene.add(mesh)
      cloudsRef.current = mesh
    })

    // ── Heat Stress Thermal Anomaly Mesh ─────────────────────────────────
    const heatMat = new THREE.ShaderMaterial({
      vertexShader:   HEAT_VERTEX,
      fragmentShader: HEAT_FRAGMENT,
      uniforms: {
        uTime:      { value: 0.0 },
        uIntensity: { value: 0.0 },
        uZoom:      { value: 0.0 },
        uMaskTex:   { value: maskTexture }
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
      side:        THREE.DoubleSide,
    })

    const heatMesh = new THREE.Mesh(
      new THREE.SphereGeometry(100.55, 160, 160), // slightly above earth surface
      heatMat
    )
    heatMesh.visible = false
    scene.add(heatMesh)
    heatMeshRef.current = heatMesh

    startTimeRef.current = performance.now()
    // RAF tick
    const tick = () => {
      const t = (performance.now() - startTimeRef.current) / 1000
      if (cloudsRef.current) cloudsRef.current.rotation.y += 0.00055
      
      if (heatMeshRef.current && heatMeshRef.current.visible) {
        const uniforms = heatMeshRef.current.material.uniforms
        uniforms.uTime.value = t
        // Scale breathing: 1.00 – 1.02 over 5 s (2π/5 ≈ 1.2566 rad/s)
        const s = 1.01 + 0.01 * Math.sin(t * 1.2566)
        heatMeshRef.current.scale.set(s, s, s)

        const distance = globeRef.current?.camera()?.position.length?.() ?? 450
        uniforms.uZoom.value = THREE.MathUtils.clamp((450 - distance) / 270, 0, 1)
      }
      globeRef.current?.controls()?.update()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [maskTexture])

  /* ── Cleanup ── */
  useEffect(() => () => {
    if (controlsRef.current) {
      const { controls, onStart, onEnd } = controlsRef.current
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end',   onEnd)
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    clearTimeout(resumeRef.current)
  }, [])

  /* ── Sync autoRotate ── */
  useEffect(() => {
    const c = globeRef.current?.controls()
    if (!c) return
    c.autoRotate = autoRotate
    if (!autoRotate) clearTimeout(resumeRef.current)
  }, [autoRotate])

  /* ── Sync hand tool ── */
  useEffect(() => {
    const c = globeRef.current?.controls()
    if (!c) return
    c.enableRotate = handToolActive
  }, [handToolActive])

  /* ── Fly-to ── */
  useEffect(() => {
    if (!flyTarget || !globeRef.current) return
    globeRef.current.pointOfView({ lat:flyTarget.lat, lng:flyTarget.lng, altitude:flyTarget.altitude }, 1500)
    clearFlyTarget()
  }, [flyTarget, clearFlyTarget])

  /* ── Sync Heat Mesh visibility & intensity ── */
  useEffect(() => {
    const mesh = heatMeshRef.current
    if (!mesh) return
    const active = activeSignals.has('heat')
    mesh.visible = active
    if (active) {
      mesh.material.uniforms.uIntensity.value = signalIntensity['heat'] ?? 1.0
    }
  }, [activeSignals, signalIntensity])

  /* ── Cursor ── */
  const cursor = useMemo(() => {
    if (!handToolActive) return 'default'
    return isDragging ? 'grabbing' : 'grab'
  }, [handToolActive, isDragging])

  /* ── Signal HTML hotspots (heat excluded) ── */
  const signalHtmlData = useMemo(() => {
    const pts = []
    activeSignals.forEach((sigId) => {
      if (sigId === 'heat') return
      const hps = SIGNAL_HOTSPOT_DATA[sigId]
      if (!hps) return
      const intensity = signalIntensity[sigId] ?? 1.0
      hps.forEach((hp) => pts.push({ ...hp, _sigId: sigId, _intensity: intensity }))
    })
    return pts
  }, [activeSignals, signalIntensity])

  const buildSignalEl = useCallback((d) => buildSignalHotspot(d, d._sigId, d._intensity ?? 1.0), [])

  /* ── Location pin builder ── */
  const buildLocationPin = (h) => {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'position:relative;width:40px;height:40px;cursor:pointer'
    for (let i=0; i<2; i++) {
      const ring = document.createElement('div')
      ring.style.cssText = `
        position:absolute;left:50%;top:50%;
        width:${i===0?18:32}px;height:${i===0?18:32}px;
        border-radius:50%;border:1.5px solid ${h.color};
        transform:translate(-50%,-50%) scale(0.6);
        animation:pulseRingHotspot 2.4s ease-out infinite ${i*0.75}s;
      `
      wrap.appendChild(ring)
    }
    const dot = document.createElement('div')
    dot.style.cssText = `
      position:absolute;left:50%;top:50%;width:9px;height:9px;
      border-radius:50%;background:${h.color};transform:translate(-50%,-50%);
      box-shadow:0 0 10px ${h.color},0 0 22px ${h.color}66;
    `
    wrap.appendChild(dot)
    const tip = document.createElement('div')
    tip.style.cssText = `
      position:absolute;left:50%;bottom:calc(100%+10px);min-width:148px;
      transform:translateX(-50%) translateY(6px);padding:10px 13px;
      background:rgba(3,8,18,0.96);border:1px solid rgba(255,255,255,0.14);
      border-radius:13px;backdrop-filter:blur(18px);opacity:0;pointer-events:none;
      transition:opacity 0.2s,transform 0.2s;font-family:Inter,sans-serif;font-size:12px;
      white-space:nowrap;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.6);
    `
    tip.innerHTML = `
      <div style="font-weight:800;color:#f7faff;margin-bottom:4px;">${h.icon} ${h.name}</div>
      <div style="color:${h.color};font-size:11px;margin-bottom:3px;">${h.event}</div>
      <div style="color:#6b7a99;font-size:10px;">
        Severity:<span style="color:${h.color};font-weight:700"> ${h.severity}</span>
        &nbsp;·&nbsp;Score <span style="color:${h.color};font-weight:700">${h.score}</span>/100
      </div>
      <div style="margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,255,255,0.08);font-size:10px;color:#4a5568;">Click to open inspector</div>
    `
    wrap.appendChild(tip)
    wrap.addEventListener('mouseenter', () => { tip.style.opacity='1'; tip.style.transform='translateX(-50%) translateY(0)' })
    wrap.addEventListener('mouseleave', () => { tip.style.opacity='0'; tip.style.transform='translateX(-50%) translateY(6px)' })
    wrap.addEventListener('click', (e) => {
      e.stopPropagation()
      setActiveRegion(h.id)
      flyTo(h.lat, h.lng, 1.8)
    })
    return wrap
  }

  /* ── Merged HTML data ── */
  const allHtmlData = useMemo(() => [
    ...HOTSPOTS.map((h) => ({ ...h, _type: 'location' })),
    ...signalHtmlData.map((h) => ({ ...h, _type: 'signal' })),
  ], [signalHtmlData])

  const buildHtmlElement = useCallback((d) => {
    if (d._type === 'signal') return buildSignalEl(d)
    return buildLocationPin(d)
  }, [buildSignalEl])

  /* ── Ring / Arc data ── */
  const ringsData = useMemo(() => {
    const r = []
    if (activeSignals.has('flood'))    FLOOD_RINGS.forEach((p)   => r.push({ ...p, _t:'flood' }))
    if (activeSignals.has('sealevel')) SEALEVEL_RINGS.forEach((p) => r.push({ ...p, _t:'sl' }))
    return r
  }, [activeSignals])

  const arcsData = useMemo(() => {
    if (!activeSignals.has('enso')) return []
    return ENSO_ARCS.map((a, i) => ({ ...a, dashLength:0.35, dashGap:0.18, dashAnimateTime:2800+i*400 }))
  }, [activeSignals])

  /* ── CSS keyframes ── */
  const animStyles = `
    @keyframes pulseRingHotspot {
      0%   { transform:translate(-50%,-50%) scale(0.6); opacity:0.9; }
      100% { transform:translate(-50%,-50%) scale(2.2); opacity:0; }
    }
    @keyframes sig-ripple  { 0%,100%{transform:translate(-50%,-50%) scale(0.96);opacity:0.75;} 50%{transform:translate(-50%,-50%) scale(1.04);opacity:0.95;} }
    @keyframes sig-flicker { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.95;} 25%{transform:translate(-50%,-50%) scale(0.94);opacity:0.65;} 50%{transform:translate(-50%,-50%) scale(1.05);opacity:1;} 75%{transform:translate(-50%,-50%) scale(0.97);opacity:0.75;} }
    @keyframes sig-diffuse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.8;} 50%{transform:translate(-50%,-50%) scale(1.06);opacity:0.5;} }
    @keyframes sig-breathe { 0%,100%{transform:translate(-50%,-50%) scale(0.88);opacity:0.55;} 50%{transform:translate(-50%,-50%) scale(1.12);opacity:0.90;} }
    @keyframes sig-haze    { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.7;} 33%{transform:translate(-50%,-50%) scale(1.04);opacity:0.9;} 66%{transform:translate(-50%,-50%) scale(0.97);opacity:0.6;} }
    @keyframes sig-blink   { 0%,49%,100%{opacity:0.9;} 50%,85%{opacity:0.2;} }
    @keyframes sig-coast   { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.8;} 50%{transform:translate(-50%,-50%) scale(1.08);opacity:0.45;} }
    @keyframes sig-current { 0%,100%{transform:translate(-50%,-50%) scale(0.95);opacity:0.65;} 50%{transform:translate(-50%,-50%) scale(1.06);opacity:0.95;} }
    @keyframes sig-spin    { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.85;} 50%{transform:translate(-50%,-50%) scale(1.1);opacity:0.5;} }
    @keyframes sig-ring-ripple  { 0%{transform:translate(-50%,-50%) scale(0.6);opacity:0.7;} 100%{transform:translate(-50%,-50%) scale(3.2);opacity:0;} }
    @keyframes sig-ring-flicker { 0%{transform:translate(-50%,-50%) scale(0.5);opacity:0.9;} 100%{transform:translate(-50%,-50%) scale(2.4);opacity:0;} }
    @keyframes sig-ring-diffuse { 0%{transform:translate(-50%,-50%) scale(0.7);opacity:0.45;} 100%{transform:translate(-50%,-50%) scale(2.8);opacity:0;} }
    @keyframes sig-ring-haze    { 0%{transform:translate(-50%,-50%) scale(0.6);opacity:0.5;} 100%{transform:translate(-50%,-50%) scale(2.5);opacity:0;} }
    @keyframes sig-ring-blink   { 0%{transform:translate(-50%,-50%) scale(0.5);opacity:0.8;} 100%{transform:translate(-50%,-50%) scale(2.2);opacity:0;} }
    @keyframes sig-ring-coast   { 0%{transform:translate(-50%,-50%) scale(0.6);opacity:0.6;} 100%{transform:translate(-50%,-50%) scale(3.5);opacity:0;} }
    @keyframes sig-ring-current { 0%{transform:translate(-50%,-50%) scale(0.5);opacity:0.7;} 100%{transform:translate(-50%,-50%) scale(2.8);opacity:0;} }
    @keyframes sig-ring-spin    { 0%{transform:translate(-50%,-50%) scale(0.5) rotate(0deg);opacity:0.8;} 100%{transform:translate(-50%,-50%) scale(2.5) rotate(180deg);opacity:0;} }
    @keyframes sig-dot-ripple  { 0%,100%{opacity:0.85;} 50%{opacity:1;} }
    @keyframes sig-dot-flicker { 0%,100%{opacity:1;} 20%{opacity:0.3;} 40%{opacity:0.9;} 60%{opacity:0.4;} 80%{opacity:1;} }
    @keyframes sig-dot-diffuse { 0%,100%{opacity:0.6;} 50%{opacity:0.9;} }
    @keyframes sig-dot-breathe { 0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(0.8);} 50%{opacity:1;transform:translate(-50%,-50%) scale(1.2);} }
    @keyframes sig-dot-haze    { 0%,100%{opacity:0.7;} 50%{opacity:0.4;} }
    @keyframes sig-dot-blink   { 0%,49%,100%{opacity:1;} 50%,84%{opacity:0.1;} }
    @keyframes sig-dot-coast   { 0%,100%{opacity:0.9;} 50%{opacity:0.5;} }
    @keyframes sig-dot-current { 0%,100%{opacity:0.75;} 50%{opacity:1;} }
    @keyframes sig-dot-spin    { 0%,100%{opacity:0.8;} 50%{opacity:0.4;} }
  `

  return (
    <div ref={containerRef} style={{ position:'absolute', inset:0, width:size.w, height:size.h, cursor }}>
      <Globe
        ref={globeRef}
        width={size.w} height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        waitForGlobeReady={false}
        globeImageUrl={EARTH_DAY}
        bumpImageUrl={EARTH_BUMP}
        showAtmosphere={true}
        atmosphereColor="#38d8ff"
        atmosphereAltitude={0.18}
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
        htmlElementsData={allHtmlData}
        htmlLat="lat" htmlLng="lng"
        htmlAltitude={(d) => d._type==='signal' ? 0.012 : 0.01}
        htmlElement={buildHtmlElement}
        ringsData={ringsData}
        ringLat="lat" ringLng="lng"
        ringColor={(d) => d._t==='sl' ? '#00bfff' : '#3399ff'}
        ringMaxRadius={3.5} ringPropagationSpeed={1.2} ringRepeatPeriod={1600}
        arcsData={arcsData}
        arcStartLat="startLat" arcStartLng="startLng"
        arcEndLat="endLat" arcEndLng="endLng"
        arcColor="color"
        arcDashLength="dashLength" arcDashGap="dashGap" arcDashAnimateTime="dashAnimateTime"
        arcStroke={0.6} arcAltitude={0.035}
        onGlobeReady={handleGlobeReady}
      />
      <style>{animStyles}</style>
    </div>
  )
}
