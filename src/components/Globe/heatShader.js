/**
 * heatShader.js — Full-globe NASA thermal overlay for Earth 2100
 *
 * Every pixel of the globe is coloured:
 *   deep blue/purple → cold poles
 *   cyan/teal        → cool mid-latitude ocean
 *   green/yellow     → warm tropical belt
 *   orange/red       → hot continental interiors & desert belts
 *
 * AdditiveBlending: colours glow on top of the Earth texture.
 * Minimum brightness = 0.18 × uIntensity so even the coldest pole
 * shows a dark-blue tint rather than being invisible.
 */

// ── Vertex shader ──────────────────────────────────────────────────────────────
export const HEAT_VERTEX = /* glsl */`
  varying vec2 vUv;
  varying vec3 vViewNormal;

  void main() {
    vUv         = uv;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// ── Fragment shader ────────────────────────────────────────────────────────────
export const HEAT_FRAGMENT = /* glsl */`
  precision mediump float;

  uniform float uTime;
  uniform float uIntensity;
  uniform sampler2D uTempMap;
  uniform float     uHasTempMap; // 1.0 = true, 0.0 = false
  uniform sampler2D uMaskTex;   // Land mask: R=1 land, R=0 ocean

  varying vec2  vUv;
  varying vec3  vViewNormal;

  // ── Gaussian blob helper ─────────────────────────────────────────────────────
  // Returns 0..1, centred at (cLat, cLng) with half-widths sLat, sLng (degrees)
  float gauss(float lat, float lng, float cLat, float cLng, float sLat, float sLng) {
    float dlat = (lat - cLat) / sLat;
    float dlng = (lng - cLng) / sLng;
    return exp(-(dlat * dlat + dlng * dlng));
  }

  // ── Simple 2-D value noise ───────────────────────────────────────────────────
  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = p*2.1+vec2(3.7,8.3); a*=0.5; }
    return v;
  }

  // ── Temperature model ────────────────────────────────────────────────────────
  float getTemp(float lat, float lng, float t, vec2 uv) {
    float base = 0.0;

    if (uHasTempMap > 0.5) {
      // 1. Read raw temperature value from live texture (Red channel)
      base = texture2D(uTempMap, uv).r;
    } else {
      // 2. Procedural Fallback: Latitudinal solar insolation (1.0 equator → 0.0 poles)
      float solar = pow(max(0.0, cos(lat * 3.14159265 / 180.0)), 1.3);
      float absLat = abs(lat);
      float ice    = smoothstep(62.0, 82.0, absLat) * 0.70;
      base   = clamp(solar - ice, 0.0, 1.0);

      // Continent heat anomalies
      float land = 0.0;
      land += 0.30 * gauss(lat, lng,  42.0, -100.0, 22.0, 28.0); // N. America
      land += 0.22 * gauss(lat, lng,  17.0,  -88.0, 12.0, 14.0); // Central America
      land += 0.28 * gauss(lat, lng,  -8.0,  -58.0, 22.0, 22.0); // S. America
      land += 0.42 * gauss(lat, lng,  22.0,   15.0, 16.0, 28.0); // Sahara
      land += 0.38 * gauss(lat, lng,  24.0,   47.0, 12.0, 14.0); // Arabia
      land += 0.28 * gauss(lat, lng,   5.0,   25.0, 22.0, 22.0); // Sub-Saharan Africa
      land += 0.20 * gauss(lat, lng,  50.0,   12.0, 18.0, 22.0); // Europe
      land += 0.35 * gauss(lat, lng,  22.0,   78.0, 14.0, 14.0); // India
      land += 0.25 * gauss(lat, lng,  45.0,  100.0, 22.0, 35.0); // East/Central Asia
      land += 0.28 * gauss(lat, lng,   5.0,  112.0, 16.0, 18.0); // SE Asia
      land += 0.38 * gauss(lat, lng, -25.0,  134.0, 16.0, 20.0); // Australia
      land += 0.25 * gauss(lat, lng,   2.0,   22.0, 18.0, 18.0); // Central Africa
      base += land;
    }

    // ── Shifting Wind Drift & Noise Animation (Runs on top of both modes) ────
    float drift = fbm(vec2(
      uv.x * 4.0 + t * 0.010,
      uv.y * 3.5 + t * 0.008
    )) * 0.12 - 0.04;

    return clamp(base + drift, 0.0, 1.0);
  }

  // ── NASA rainbow palette (8 stops, WebGL-safe if-chain) ─────────────────────
  // cold: deep navy → blue → cyan → green → yellow-green → yellow → orange → red :hot
  vec3 palette(float s) {
    s = clamp(s, 0.0, 1.0);
    vec3 c0 = vec3(0.05, 0.02, 0.50);  // deep navy  (polar cold)
    vec3 c1 = vec3(0.00, 0.22, 1.00);  // cobalt blue
    vec3 c2 = vec3(0.00, 0.72, 0.95);  // cyan
    vec3 c3 = vec3(0.00, 0.90, 0.65);  // teal-green
    vec3 c4 = vec3(0.45, 0.95, 0.00);  // yellow-green
    vec3 c5 = vec3(1.00, 0.92, 0.00);  // yellow
    vec3 c6 = vec3(1.00, 0.40, 0.00);  // orange
    vec3 c7 = vec3(0.92, 0.00, 0.00);  // red        (desert hot)

    float t7  = s * 7.0;
    float seg = floor(t7);
    float f   = t7 - seg;
    f = f * f * (3.0 - 2.0 * f);   // smooth Hermite

    vec3 col = c7;
    if      (seg < 1.0) col = mix(c0, c1, f);
    else if (seg < 2.0) col = mix(c1, c2, f);
    else if (seg < 3.0) col = mix(c2, c3, f);
    else if (seg < 4.0) col = mix(c3, c4, f);
    else if (seg < 5.0) col = mix(c4, c5, f);
    else if (seg < 6.0) col = mix(c5, c6, f);
    else                col = mix(c6, c7, f);
    return col;
  }

  // ── Main ─────────────────────────────────────────────────────────────────────
  void main() {
    // ── LAND MASK (first op — cheapest possible discard) ─────────────────────
    // The mask texture was rasterised from the world GeoJSON:
    //   R = 1.0 → land pixel   → continue rendering
    //   R = 0.0 → ocean pixel  → discard immediately, natural Earth shows through
    float isLand = texture2D(uMaskTex, vUv).r;
    if (isLand < 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    float lat = (0.5 - vUv.y) * 180.0;
    float lng = (vUv.x - 0.5) * 360.0;

    vec3  col;
    float temp;
    float brightness;
    float rim = abs(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)));
    float rimFade = smoothstep(0.0, 0.22, rim);

    if (uHasTempMap > 0.5) {
      // ── REAL-TIME NASA SATELLITE PATH ─────────────────────────────────────
      vec4 texCol = texture2D(uTempMap, vUv);

      if (texCol.a > 0.05) {
        // ── NASA has data for this pixel (clear-sky land) ─────────────────
        // Use NASA's scientific thermal colour directly — it's already
        // calibrated to the exact temperature palette.
        col  = texCol.rgb;
        temp = clamp(dot(col, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);

        // Subtle atmospheric shimmer on top of real data
        float drift = fbm(vec2(vUv.x * 4.0 + uTime * 0.008, vUv.y * 3.5 + uTime * 0.006)) * 0.06;
        temp = clamp(temp + drift, 0.0, 1.0);

        // High minimum (0.50) — NASA pixels always pop vividly
        brightness = (0.50 + 0.50 * temp) * uIntensity * rimFade;
        gl_FragColor = vec4(col * brightness, brightness * 0.92);
        return;
      }
      // ── No NASA data here (ocean, cloud-covered land, data gap) ──────────
      // Fall through to the procedural model below so the globe is NEVER
      // blank. The procedural runs at low brightness so it looks clearly
      // secondary to the vivid satellite data where it exists.
    }

    // ── PROCEDURAL PATH ───────────────────────────────────────────────────
    // Runs when:  (a) no NASA texture loaded, OR
    //             (b) NASA texture loaded but no data for this pixel
    temp = getTemp(lat, lng, uTime, vUv);
    col  = palette(temp);

    // Lower minimum brightness (0.12) when NASA texture is present so the
    // procedural looks secondary; full brightness (0.18) when it's the only source.
    float minB = uHasTempMap > 0.5 ? 0.12 : 0.18;
    brightness = (minB + (1.0 - minB) * temp) * uIntensity * rimFade;

    gl_FragColor = vec4(col * brightness, brightness * 0.88);
  }
`


