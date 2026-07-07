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
  varying vec3 vPos3D;
  varying vec2 vUv;

  // ============================================================
  // TEMPERATURE CALCULATION - NASA/GOES Style
  // ============================================================
  
  float getTemperature(float lat, float lng, float time) {
    float absLat = abs(lat);
    
    // 1. Base latitudinal gradient (equator warm, poles cold)
    float temp = cos(lat * 3.14159265 / 180.0);
    temp = temp * 0.7 + 0.3;
    
    // 2. Seasonal variation
    float season = sin(time * 0.0172 + lat * 0.01) * 0.08;
    temp += season;
    
    // 3. Regional Hotspots (NASA-style heat domes)
    
    // Sahara Desert (23°N, 10°E)
    float sahara = exp(-pow((lat - 23.0) / 10.0, 2.0) - pow((lng - 10.0) / 15.0, 2.0));
    temp += sahara * 0.28;
    
    // Arabian Peninsula (25°N, 45°E)
    float arabia = exp(-pow((lat - 25.0) / 8.0, 2.0) - pow((lng - 45.0) / 10.0, 2.0));
    temp += arabia * 0.25;
    
    // Amazon Rainforest (5°S, 60°W)
    float amazon = exp(-pow((lat + 5.0) / 12.0, 2.0) - pow((lng + 60.0) / 15.0, 2.0));
    temp += amazon * 0.18;
    
    // North America (35°N, 100°W)
    float na = exp(-pow((lat - 35.0) / 12.0, 2.0) - pow((lng + 100.0) / 18.0, 2.0));
    temp += na * 0.22;
    
    // Europe (45°N, 10°E)
    float europe = exp(-pow((lat - 45.0) / 8.0, 2.0) - pow((lng - 10.0) / 12.0, 2.0));
    temp += europe * 0.18;
    
    // Southeast Asia (0°N, 115°E)
    float sea = exp(-pow((lat - 0.0) / 10.0, 2.0) - pow((lng - 115.0) / 18.0, 2.0));
    temp += sea * 0.20;
    
    // Australia (25°S, 135°E)
    float australia = exp(-pow((lat + 25.0) / 10.0, 2.0) - pow((lng - 135.0) / 15.0, 2.0));
    temp += australia * 0.22;
    
    // India (20°N, 78°E)
    float india = exp(-pow((lat - 20.0) / 8.0, 2.0) - pow((lng - 78.0) / 10.0, 2.0));
    temp += india * 0.20;
    
    // China (35°N, 105°E)
    float china = exp(-pow((lat - 35.0) / 10.0, 2.0) - pow((lng - 105.0) / 15.0, 2.0));
    temp += china * 0.18;
    
    // 4. Ocean currents (Gulf Stream, Kuroshio)
    
    // Gulf Stream (warm)
    float gulf = exp(-pow((lat - 30.0) / 8.0, 2.0) - pow((lng + 75.0) / 10.0, 2.0));
    temp += gulf * 0.15;
    
    // Kuroshio (warm)
    float kuro = exp(-pow((lat - 30.0) / 8.0, 2.0) - pow((lng - 135.0) / 10.0, 2.0));
    temp += kuro * 0.12;
    
    // Humboldt (cold)
    float humboldt = exp(-pow((lat + 15.0) / 10.0, 2.0) - pow((lng + 80.0) / 12.0, 2.0));
    temp -= humboldt * 0.10;
    
    // Benguela (cold)
    float benguela = exp(-pow((lat + 25.0) / 10.0, 2.0) - pow((lng + 15.0) / 10.0, 2.0));
    temp -= benguela * 0.08;
    
    // 5. ENSO effect (El Niño/La Niña)
    if (absLat < 20.0 && abs(lng + 150.0) < 30.0) {
      float enso = exp(-pow((lat - 0.0) / 10.0, 2.0) - pow((lng + 150.0) / 20.0, 2.0));
      float phase = sin(time * 0.008) * 0.5 + 0.5;
      temp += enso * phase * 0.15;
    }
    
    // 6. Small noise for natural variation
    float noise = sin(lat * 15.0 + lng * 20.0 + time * 0.5) * 0.02;
    temp += noise;
    
    return clamp(temp, 0.0, 1.0);
  }

  // ============================================================
  // NASA THERMAL PALETTE - 10 Colors
  // ============================================================
  vec3 thermalPalette(float t) {
    float s = clamp(t, 0.0, 1.0);
    
    // 10-color NASA/GOES thermal palette
    vec3 colors[10];
    colors[0] = vec3(0.00, 0.00, 0.60);  // Very cold (deep blue)
    colors[1] = vec3(0.00, 0.15, 0.95);  // Cold (bright blue)
    colors[2] = vec3(0.00, 0.60, 0.95);  // Cool (light blue)
    colors[3] = vec3(0.00, 0.85, 0.85);  // Moderate (cyan)
    colors[4] = vec3(0.00, 0.90, 0.40);  // Warm (green)
    colors[5] = vec3(0.60, 0.95, 0.00);  // Warmer (yellow-green)
    colors[6] = vec3(0.95, 0.95, 0.00);  // Hot (yellow)
    colors[7] = vec3(0.95, 0.60, 0.00);  // Very hot (orange)
    colors[8] = vec3(0.90, 0.20, 0.00);  // Extreme (red)
    colors[9] = vec3(0.70, 0.00, 0.00);  // Critical (dark red)
    
    float p = s * 9.0;
    float idx = floor(p);
    float frac = p - idx;
    
    // Smooth Hermite interpolation
    frac = frac * frac * (3.0 - 2.0 * frac);
    
    int i0 = int(idx);
    int i1 = min(i0 + 1, 9);
    
    return mix(colors[i0], colors[i1], frac);
  }

  // ============================================================
  // MAIN FRAGMENT SHADER
  // ============================================================
  void main() {
    // Convert UV to lat/lng
    float lng = (vUv.x - 0.5) * 360.0;
    float lat = (0.5 - vUv.y) * 180.0;
    
    // Calculate temperature
    float temp = getTemperature(lat, lng, uTime);
    
    // Apply intensity
    float scaledTemp = temp * uIntensity;
    
    // Get color from NASA palette
    vec3 color = thermalPalette(scaledTemp);
    
    // Alpha - high opacity, slight polar fade
    float absLat = abs(lat);
    float alpha = 0.85 * uIntensity * mix(1.0, 0.7, absLat / 90.0);
    
    // Final output
    gl_FragColor = vec4(color, alpha);
  }
`