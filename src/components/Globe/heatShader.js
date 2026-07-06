/**
 * heatShader.js — NASA-style thermal overlay for Earth 2100
 *
 * Renders a continuous, full-globe temperature gradient directly on the GPU.
 * WebGL-1 safe: no dynamic array indexing.
 * Palette: deep-blue (cold poles) → cyan → green → yellow → orange → red (hot tropics)
 */

// ── Vertex shader ──────────────────────────────────────────────────────────────
export const HEAT_VERTEX = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(normalMatrix * normal);
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// ── Fragment shader ────────────────────────────────────────────────────────────
export const HEAT_FRAGMENT = /* glsl */`
  precision mediump float;

  uniform float uTime;       // seconds since mount
  uniform float uIntensity;  // 0..1 driven by signal slider

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  // ── Smooth 2-D value noise ─────────────────────────────────────────────────
  float hash2(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // 4-octave fBm
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p  = p * 2.1 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  // ── Geographic temperature model [0 = ice-cold, 1 = scorching] ─────────────
  float calcTemp(float lat, float lng, float t) {
    float absLat = abs(lat);

    // 1. Solar insolation — cos-latitude, peaks at equator
    float solar = pow(max(0.0, cos(lat * 0.017453293)), 1.3);

    // 2. Polar suppression — ice sheets
    float ice = smoothstep(55.0, 78.0, absLat) * 0.65;

    // 3. Subtropical desert belt (Sahara, Arabia, Australia ~25-35°)
    float desert = exp(-pow((absLat - 27.0) / 11.0, 2.0)) * 0.28;

    float base = clamp(solar + desert - ice, 0.02, 0.98);

    // 4. Regional hotspots (Gaussian blobs, static geography)
    float h = 0.0;
    // Sahara / N. Africa
    h += 0.22 * exp(-pow((lat - 22.0)/12.0,2.0) - pow((lng - 15.0)/25.0,2.0));
    // Arabian Peninsula
    h += 0.20 * exp(-pow((lat - 24.0)/9.0,2.0)  - pow((lng - 47.0)/14.0,2.0));
    // Australia outback
    h += 0.18 * exp(-pow((lat + 26.0)/11.0,2.0) - pow((lng -134.0)/20.0,2.0));
    // South Asia / India
    h += 0.16 * exp(-pow((lat - 22.0)/9.0,2.0)  - pow((lng - 78.0)/12.0,2.0));
    // Amazon basin (hot-humid)
    h += 0.12 * exp(-pow((lat +  5.0)/12.0,2.0) - pow((lng + 60.0)/18.0,2.0));
    // Gulf Stream warm patch
    h += 0.10 * exp(-pow((lat - 35.0)/8.0,2.0)  - pow((lng + 68.0)/10.0,2.0));
    // Kuroshio warm patch
    h += 0.09 * exp(-pow((lat - 32.0)/8.0,2.0)  - pow((lng -142.0)/12.0,2.0));
    // Cold Humboldt upwelling
    h -= 0.10 * exp(-pow((lat + 16.0)/10.0,2.0) - pow((lng + 80.0)/12.0,2.0));

    // 5. Slow planetary-scale noise drift (simulates synoptic weather)
    float drift = fbm(vec2(
      lng * 0.007 + t * 0.005,
      lat * 0.009 + t * 0.004
    )) - 0.5;

    return clamp(base + h + drift * 0.15, 0.0, 1.0);
  }

  // ── NASA / GOES rainbow palette — WebGL-1 safe (explicit mix chains) ────────
  // 8 stops:  navy → blue → cyan → green → lime → yellow → orange → red
  vec3 thermalPalette(float s) {
    s = clamp(s, 0.0, 1.0);

    vec3 c0 = vec3(0.02, 0.01, 0.55);  // 0.000  deep navy  (polar ice)
    vec3 c1 = vec3(0.00, 0.20, 1.00);  // 0.143  blue       (very cold)
    vec3 c2 = vec3(0.00, 0.75, 0.95);  // 0.286  cyan       (cool)
    vec3 c3 = vec3(0.00, 0.88, 0.35);  // 0.429  green      (mild)
    vec3 c4 = vec3(0.50, 0.95, 0.00);  // 0.571  lime       (warm)
    vec3 c5 = vec3(1.00, 0.95, 0.00);  // 0.714  yellow     (hot)
    vec3 c6 = vec3(1.00, 0.40, 0.00);  // 0.857  orange     (very hot)
    vec3 c7 = vec3(0.88, 0.00, 0.00);  // 1.000  red        (extreme)

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

  // ── Main (Simulates a physical LED screen subpixel matrix) ──────────────────
  void main() {
    // 1. Grid definition (high density so they blend from a distance)
    vec2 grid = vec2(1000.0, 500.0);

    // 2. Find local cell coordinates and cell center
    vec2 cellUv     = fract(vUv * grid);
    vec2 cellCenter = (floor(vUv * grid) + vec2(0.5)) / grid;

    // 3. Convert cell center UV to geographic coordinates
    float lng = (cellCenter.x - 0.5) * 360.0;
    float lat = (0.5 - cellCenter.y) * 180.0;

    // 4. Calculate local temperature and palette color
    float temp = calcTemp(lat, lng, uTime);
    vec3  col  = thermalPalette(temp);

    // 5. Divide the cell horizontally into 3 subpixel stripes (Red, Green, Blue)
    float subX      = cellUv.x * 3.0;
    int   subIdx    = int(floor(subX));
    float subFracX  = fract(subX);

    // Assign color based on active subpixel band (Red/Green/Blue emitter)
    vec3 subCol = vec3(0.0);
    if (subIdx == 0) {
      subCol = vec3(col.r * 1.8, 0.0, 0.0); // Boost brightness to compensate for 1/3 aperture area
    } else if (subIdx == 1) {
      subCol = vec3(0.0, col.g * 1.8, 0.0);
    } else {
      subCol = vec3(0.0, 0.0, col.b * 1.8);
    }

    // 6. Subpixel emitter mask (rounded pill-like shape inside its band)
    float subMaskX = smoothstep(0.05, 0.20, subFracX) * smoothstep(0.95, 0.80, subFracX);
    float subMaskY = smoothstep(0.05, 0.15, cellUv.y) * smoothstep(0.95, 0.85, cellUv.y);
    float emitterMask = subMaskX * subMaskY;

    // 7. Dynamic transparency with polar and rim fade
    float absLat  = abs(lat);
    float latFade = mix(1.0, 0.55, pow(absLat / 90.0, 1.6));
    float rimFade = clamp(abs(dot(vWorldNormal, vec3(0.0, 0.0, 1.0))), 0.3, 1.0);
    float alpha   = uIntensity * 0.85 * latFade * rimFade * emitterMask;

    gl_FragColor = vec4(subCol, clamp(alpha, 0.0, 0.90));
  }
`