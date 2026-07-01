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

  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    vec3 s = p;
    for (int i = 0; i < 5; i++) {
      v += a * snoise(s);
      s  = s * 2.1 + vec3(1.7, 9.2, 3.4);
      a *= 0.48;
    }
    return v;
  }

  float oceanSST(float lat, float lng, float t) {
    float absLat = abs(lat);
    float phi    = lat * 3.14159265 / 180.0;
    float solar = pow(max(0.0, cos(phi)), 1.15) * 0.82;
    float polar = 0.28 * pow(min(1.0, absLat / 62.0), 1.6);
    float gyre = 0.13 * exp(-pow((absLat - 33.0) / 13.0, 2.0));
    float base = clamp(solar + gyre - polar, 0.02, 0.98);
    float zonalDrift = sin(lat / 90.0 * 3.14159265 * 1.6) * 0.011 * t;
    float current = fbm(vec3(lng * 0.010 + zonalDrift, lat * 0.014, t * 0.038)) - 0.5;
    float eddy = snoise(vec3(lng * 0.024 + zonalDrift * 0.6, lat * 0.021, 1.8 + t * 0.052)) * 0.11;

    return clamp(base + current * 0.14 + eddy, 0.0, 1.0);
  }

  vec3 sstPalette(float t) {
    float s = clamp(t, 0.0, 1.0);
    if      (s < 0.167) return mix(vec3(0.00, 0.00, 0.52), vec3(0.00, 0.10, 1.00), s / 0.167);
    else if (s < 0.333) return mix(vec3(0.00, 0.10, 1.00), vec3(0.00, 0.92, 0.92), (s-0.167)/0.167);
    else if (s < 0.500) return mix(vec3(0.00, 0.92, 0.92), vec3(0.00, 0.90, 0.00), (s-0.333)/0.167);
    else if (s < 0.667) return mix(vec3(0.00, 0.90, 0.00), vec3(1.00, 1.00, 0.00), (s-0.500)/0.167);
    else if (s < 0.833) return mix(vec3(1.00, 1.00, 0.00), vec3(1.00, 0.38, 0.00), (s-0.667)/0.167);
    else               return mix(vec3(1.00, 0.38, 0.00),  vec3(1.00, 0.00, 0.00), (s-0.833)/0.167);
  }

  void main() {
    float isLand = texture2D(uMaskTex, vUv).r;
    if (isLand > 0.5) discard;

    float lng = (vUv.x - 0.5) * 360.0;
    float lat = (0.5 - vUv.y) * 180.0;
    float sst = oceanSST(lat, lng, uTime);
    vec3 col = sstPalette(sst);
    float alpha = uIntensity * mix(0.82, 0.65, pow(abs(lat) / 90.0, 1.4));

    gl_FragColor = vec4(col, alpha);
  }
`
