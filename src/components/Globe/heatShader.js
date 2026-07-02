// export const HEAT_VERTEX = `
//   varying vec3 vPos3D;
//   varying vec2 vUv;
//   void main() {
//     vUv    = uv;
//     vPos3D = normalize(position);
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//   }
// `

// export const HEAT_FRAGMENT = `
//   uniform float uTime;
//   uniform float uIntensity;
//   uniform float uZoom;
//   uniform sampler2D uMaskTex;
//   varying vec3 vPos3D;
//   varying vec2 vUv;

//   vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
//   vec4 tInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
//   float snoise(vec3 v){
//     const vec2 C=vec2(1.0/6.0,1.0/3.0);
//     const vec4 D=vec4(0.0,0.5,1.0,2.0);
//     vec3 i=floor(v+dot(v,C.yyy));
//     vec3 x0=v-i+dot(i,C.xxx);
//     vec3 g=step(x0.yzx,x0.xyz);
//     vec3 l=1.0-g;
//     vec3 i1=min(g.xyz,l.zxy);
//     vec3 i2=max(g.xyz,l.zxy);
//     vec3 x1=x0-i1+C.xxx;
//     vec3 x2=x0-i2+2.0*C.xxx;
//     vec3 x3=x0-D.yyy;
//     i=mod(i,289.0);
//     vec4 p=permute(permute(permute(
//       i.z+vec4(0.0,i1.z,i2.z,1.0))
//       +i.y+vec4(0.0,i1.y,i2.y,1.0))
//       +i.x+vec4(0.0,i1.x,i2.x,1.0));
//     float n_=0.142857142857;
//     vec3 ns=n_*D.wyz-D.xzx;
//     vec4 j=p-49.0*floor(p*ns.z*ns.z);
//     vec4 x_=floor(j*ns.z);
//     vec4 y_=floor(j-7.0*x_);
//     vec4 x=x_*ns.x+ns.yyyy;
//     vec4 y=y_*ns.x+ns.yyyy;
//     vec4 h=1.0-abs(x)-abs(y);
//     vec4 b0=vec4(x.xy,y.xy);
//     vec4 b1=vec4(x.zw,y.zw);
//     vec4 s0=floor(b0)*2.0+1.0;
//     vec4 s1=floor(b1)*2.0+1.0;
//     vec4 sh=-step(h,vec4(0.0));
//     vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
//     vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
//     vec3 p0=vec3(a0.xy,h.x);
//     vec3 p1=vec3(a0.zw,h.y);
//     vec3 p2=vec3(a1.xy,h.z);
//     vec3 p3=vec3(a1.zw,h.w);
//     vec4 norm=tInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
//     p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
//     vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
//     m=m*m;
//     return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
//   }

//   float fbm(vec3 p) {
//     float v = 0.0, a = 0.5;
//     vec3 s = p;
//     for (int i = 0; i < 5; i++) {
//       v += a * snoise(s);
//       s  = s * 2.1 + vec3(1.7, 9.2, 3.4);
//       a *= 0.48;
//     }
//     return v;
//   }

//   float oceanSST(float lat, float lng, float t) {
//     float absLat = abs(lat);
//     float phi    = lat * 3.14159265 / 180.0;
//     float solar = pow(max(0.0, cos(phi)), 1.15) * 0.82;
//     float polar = 0.28 * pow(min(1.0, absLat / 62.0), 1.6);
//     float gyre = 0.13 * exp(-pow((absLat - 33.0) / 13.0, 2.0));
//     float base = clamp(solar + gyre - polar, 0.02, 0.98);
//     float zonalDrift = sin(lat / 90.0 * 3.14159265 * 1.6) * 0.011 * t;
//     float current = fbm(vec3(lng * 0.010 + zonalDrift, lat * 0.014, t * 0.038)) - 0.5;
//     float eddy = snoise(vec3(lng * 0.024 + zonalDrift * 0.6, lat * 0.021, 1.8 + t * 0.052)) * 0.11;

//     return clamp(base + current * 0.14 + eddy, 0.0, 1.0);
//   }

//   vec3 sstPalette(float t) {
//     float s = clamp(t, 0.0, 1.0);
//     if      (s < 0.167) return mix(vec3(0.00, 0.00, 0.52), vec3(0.00, 0.10, 1.00), s / 0.167);
//     else if (s < 0.333) return mix(vec3(0.00, 0.10, 1.00), vec3(0.00, 0.92, 0.92), (s-0.167)/0.167);
//     else if (s < 0.500) return mix(vec3(0.00, 0.92, 0.92), vec3(0.00, 0.90, 0.00), (s-0.333)/0.167);
//     else if (s < 0.667) return mix(vec3(0.00, 0.90, 0.00), vec3(1.00, 1.00, 0.00), (s-0.500)/0.167);
//     else if (s < 0.833) return mix(vec3(1.00, 1.00, 0.00), vec3(1.00, 0.38, 0.00), (s-0.667)/0.167);
//     else               return mix(vec3(1.00, 0.38, 0.00),  vec3(1.00, 0.00, 0.00), (s-0.833)/0.167);
//   }

//   void main() {
//     float isLand = texture2D(uMaskTex, vUv).r;
//     if (isLand > 0.5) discard;

//     float lng = (vUv.x - 0.5) * 360.0;
//     float lat = (0.5 - vUv.y) * 180.0;
//     float sst = oceanSST(lat, lng, uTime);
//     vec3 col = sstPalette(sst);
//     float alpha = uIntensity * mix(0.82, 0.65, pow(abs(lat) / 90.0, 1.4));

//     gl_FragColor = vec4(col, alpha);
//   }
// `




export const HEAT_VERTEX = `
  varying vec3 vPos3D;
  varying vec2 vUv;
  void main() {
    vUv    = uv;
    vPos3D = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const HEAT_FRAGMENT = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uZoom;
  uniform sampler2D uMaskTex;
  varying vec3 vPos3D;
  varying vec2 vUv;

  // ============================================================
  // NOISE FUNCTIONS (optimized)
  // ============================================================
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

  // Optimized FBM - 4 octaves
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 s = p;
    v += a * snoise(s);
    s = s * 2.1 + vec3(1.7, 9.2, 3.4);
    a *= 0.48;
    v += a * snoise(s);
    s = s * 2.1 + vec3(1.7, 9.2, 3.4);
    a *= 0.48;
    v += a * snoise(s);
    s = s * 2.1 + vec3(1.7, 9.2, 3.4);
    a *= 0.48;
    v += a * snoise(s);
    return v;
  }

  // ============================================================
  // OCEAN TEMPERATURE
  // ============================================================
  float oceanSST(float lat, float lng, float t) {
    float absLat = abs(lat);
    float phi    = lat * 3.14159265 / 180.0;
    
    float cosPhi = max(0.0, cos(phi));
    float solar = pow(cosPhi, 1.15) * 0.82;
    float polar = 0.28 * pow(min(1.0, absLat / 62.0), 1.6);
    float gyre = 0.13 * exp(-pow((absLat - 33.0) / 13.0, 2.0));
    float base = clamp(solar + gyre - polar, 0.02, 0.98);
    
    float zonalDrift = sin(lat / 90.0 * 3.14159265 * 1.6) * 0.011 * t;
    float current = fbm(vec3(lng * 0.010 + zonalDrift, lat * 0.014, t * 0.038)) - 0.5;
    float eddy = snoise(vec3(lng * 0.024 + zonalDrift * 0.6, lat * 0.021, 1.8 + t * 0.052)) * 0.11;

    return clamp(base + current * 0.14 + eddy, 0.0, 1.0);
  }

  // ============================================================
  // LAND TEMPERATURE (NEW - realistic heatwaves)
  // ============================================================
  
  // Base latitudinal gradient for land
  float getLandBaseTemp(float lat) {
    float absLat = abs(lat);
    // Warmer equator, colder poles
    float temp = cos(lat * 3.14159265 / 180.0);
    // Continental effect - land heats more
    temp = temp * 0.8 + 0.2;
    return clamp(temp, 0.0, 1.0);
  }

  // Regional heatwave patterns (like NASA GEOS data)
  float getHeatwavePattern(float lat, float lng, float time) {
    float heatwave = 0.0;
    
    // Heat dome over Middle East / South Asia (primary)
    float meLat = 28.0, meLng = 50.0;
    float meDist = distance(vec2(lat, lng), vec2(meLat, meLng));
    heatwave += exp(-meDist * meDist / 350.0) * 0.40;
    
    // Heat dome over North America
    float naLat = 35.0, naLng = -100.0;
    float naDist = distance(vec2(lat, lng), vec2(naLat, naLng));
    heatwave += exp(-naDist * naDist / 450.0) * 0.30;
    
    // Heat dome over Europe
    float euLat = 45.0, euLng = 10.0;
    float euDist = distance(vec2(lat, lng), vec2(euLat, euLng));
    heatwave += exp(-euDist * euDist / 300.0) * 0.25;
    
    // Sahara Desert
    float saLat = 23.0, saLng = 10.0;
    float saDist = distance(vec2(lat, lng), vec2(saLat, saLng));
    heatwave += exp(-saDist * saDist / 600.0) * 0.35;
    
    // Australian heat
    float auLat = -25.0, auLng = 135.0;
    float auDist = distance(vec2(lat, lng), vec2(auLat, auLng));
    heatwave += exp(-auDist * auDist / 500.0) * 0.25;
    
    // Heatwave movement (slow drift)
    float timeOffset = sin(time * 0.008 + lng * 0.015) * 0.08;
    
    return clamp(heatwave + timeOffset, 0.0, 0.55);
  }

  // Seasonal variation
  float getSeasonalEffect(float lat, float time) {
    float declination = 23.44 * sin(time * 0.0172);
    float solarAngle = lat - declination;
    float solarFactor = cos(solarAngle * 3.14159265 / 180.0);
    return clamp(solarFactor * 0.15 + 0.85, 0.7, 1.0);
  }

  // Combine land temperature
  float getLandTemperature(float lat, float lng, float time) {
    float temp = getLandBaseTemp(lat);
    temp *= getSeasonalEffect(lat, time);
    temp += getHeatwavePattern(lat, lng, time);
    
    // Small diurnal cycle
    float diurnal = sin(time * 0.5 + lng * 0.02) * 0.03;
    temp += diurnal;
    
    return clamp(temp, 0.0, 1.0);
  }

  // ============================================================
  // NASA/GOES THERMAL PALETTE (10 stops)
  // ============================================================
  vec3 thermalPalette(float t) {
    float s = clamp(t, 0.0, 1.0);
    
    // Color stops: cold → cool → moderate → warm → hot → extreme
    vec3 c0 = vec3(0.00, 0.00, 0.60); // Very cold
    vec3 c1 = vec3(0.00, 0.15, 0.95); // Cold
    vec3 c2 = vec3(0.00, 0.60, 0.95); // Cool
    vec3 c3 = vec3(0.00, 0.85, 0.85); // Moderate (cyan)
    vec3 c4 = vec3(0.00, 0.90, 0.40); // Warm (green)
    vec3 c5 = vec3(0.60, 0.95, 0.00); // Warmer (yellow-green)
    vec3 c6 = vec3(0.95, 0.95, 0.00); // Hot (yellow)
    vec3 c7 = vec3(0.95, 0.60, 0.00); // Very hot (orange)
    vec3 c8 = vec3(0.90, 0.20, 0.00); // Extreme (red)
    vec3 c9 = vec3(0.70, 0.00, 0.00); // Critical (dark red)
    
    float p = s * 8.0;
    float idx = floor(p);
    float frac = p - idx;
    frac = frac * frac * (3.0 - 2.0 * frac);
    
    if (idx < 1.0) return mix(c0, c1, frac);
    if (idx < 2.0) return mix(c1, c2, frac);
    if (idx < 3.0) return mix(c2, c3, frac);
    if (idx < 4.0) return mix(c3, c4, frac);
    if (idx < 5.0) return mix(c4, c5, frac);
    if (idx < 6.0) return mix(c5, c6, frac);
    if (idx < 7.0) return mix(c6, c7, frac);
    if (idx < 8.0) return mix(c7, c8, frac);
    return mix(c8, c9, frac);
  }

  // ============================================================
  // MAIN FRAGMENT SHADER
  // ============================================================
  void main() {
    // REMOVED: Land mask discard - now shows on land AND ocean
    // float isLand = texture2D(uMaskTex, vUv).r;
    // if (isLand > 0.5) discard;

    float lng = (vUv.x - 0.5) * 360.0;
    float lat = (0.5 - vUv.y) * 180.0;
    
    // Get land mask for blending
    float isLand = texture2D(uMaskTex, vUv).r;
    
    // Calculate temperature for land and ocean
    float oceanTemp = oceanSST(lat, lng, uTime);
    float landTemp = getLandTemperature(lat, lng, uTime);
    
    // Blend based on land mask (smooth transition at coastlines)
    float blendFactor = smoothstep(0.3, 0.7, isLand);
    float temperature = mix(oceanTemp, landTemp, blendFactor);
    
    // Apply intensity uniform
    float scaledTemp = temperature * uIntensity;
    
    // Get color from NASA palette
    vec3 color = thermalPalette(scaledTemp);
    
    // Alpha - full coverage with slight polar fade
    float absLat = abs(lat);
    float alpha = uIntensity * mix(0.88, 0.65, pow(absLat / 90.0, 1.2));
    
    // Zoom-based enhancement
    float zoomEnhance = 0.8 + uZoom * 0.4;
    alpha *= zoomEnhance;
    
    // Final output
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.95));
  }
`