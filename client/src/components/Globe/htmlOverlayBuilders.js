const ANIM_TYPE = {
  flood: 'ripple',
  wildfire: 'flicker',
  drought: 'diffuse',
  cryo: 'breathe',
  air: 'haze',
  forest: 'blink',
  sealevel: 'coast',
  enso: 'current',
  storm: 'spin',
}

const BASE_OPACITY = {
  flood: 0.25,
  wildfire: 0.40,
  drought: 0.20,
  cryo: 0.30,
  air: 0.25,
  forest: 0.30,
  sealevel: 0.30,
  enso: 0.25,
  storm: 0.35,
}

const alphaHex = (value) => Math.round(value * 255).toString(16).padStart(2, '0')

export function buildSignalHotspot(hp, signalId, intensity) {
  const anim = ANIM_TYPE[signalId] || 'pulse'
  const isFlood = signalId === 'flood'
  const opBase = (BASE_OPACITY[signalId] ?? 0.3) * intensity * (isFlood ? 1.50 : 1.0)
  const r = hp.radius * (isFlood ? 1.15 : 1.0)

  const wrap = document.createElement('div')
  wrap.style.cssText = `position:relative;width:${r * 2}px;height:${r * 2}px;pointer-events:auto;cursor:crosshair;`

  const halo = document.createElement('div')
  halo.style.cssText = `
    position:absolute;left:50%;top:50%;width:${r * (isFlood ? 3.6 : 2.8)}px;height:${r * (isFlood ? 3.6 : 2.8)}px;
    border-radius:50%;transform:translate(-50%,-50%);
    background:radial-gradient(circle,${hp.c2}${alphaHex(opBase * 0.38)} 0%,${hp.c3}0a 50%,transparent 75%);
    filter:blur(${r * (isFlood ? 0.65 : 0.45)}px);pointer-events:none;mix-blend-mode:screen;
  `
  wrap.appendChild(halo)

  const fill = document.createElement('div')
  const animDuration = isFlood ? 1.1 : (anim === 'ripple' ? 2.2 : anim === 'breathe' ? 3.5 : 1.5)
  fill.style.cssText = `
    position:absolute;left:50%;top:50%;width:${r * 2}px;height:${r * 2}px;
    border-radius:50%;transform:translate(-50%,-50%);
    background:radial-gradient(circle,
      ${hp.c1}${alphaHex(opBase * 0.92)} 0%,
      ${hp.c2}${alphaHex(opBase * 0.55)} 38%,
      ${hp.c3}${alphaHex(opBase * 0.18)} 68%,transparent 100%);
    filter:blur(${r * 0.18}px);pointer-events:none;mix-blend-mode:screen;
    animation:sig-${anim} ${animDuration}s ease-in-out infinite;
  `
  wrap.appendChild(fill)

  const numRings = anim === 'breathe' ? 0 : anim === 'coast' ? 3 : 2
  for (let i = 0; i < numRings; i++) {
    const ring = document.createElement('div')
    const ringDuration = isFlood ? 1.1 : (anim === 'ripple' ? 2.2 : anim === 'coast' ? 3.0 : 1.8)
    const ringDelay = i * (isFlood ? 0.45 : (anim === 'ripple' ? 0.9 : anim === 'coast' ? 1.1 : 0.7))
    ring.style.cssText = `
      position:absolute;left:50%;top:50%;width:${r * 1.1}px;height:${r * 1.1}px;
      border-radius:50%;border:${isFlood ? 3.0 : (anim === 'coast' ? 1.5 : 2)}px solid ${isFlood ? '#00e5ff' : hp.c2};
      transform:translate(-50%,-50%) scale(0.5);
      pointer-events:none;mix-blend-mode:screen;opacity:0;
      animation:sig-ring-${anim} ${ringDuration}s ease-out infinite ${ringDelay}s;
    `
    wrap.appendChild(ring)
  }

  const dot = document.createElement('div')
  const dotR = Math.max(4, r * 0.10)
  const dotDuration = isFlood ? 0.9 : (anim === 'blink' ? 1.2 : anim === 'flicker' ? 0.4 : 1.8)
  dot.style.cssText = `
    position:absolute;left:50%;top:50%;width:${dotR * 2}px;height:${dotR * 2}px;
    border-radius:50%;background:${isFlood ? '#00e5ff' : hp.c1};transform:translate(-50%,-50%);
    box-shadow:0 0 ${dotR * 1.5}px ${hp.c1},0 0 ${dotR * 3}px ${hp.c2},0 0 ${dotR * 5}px ${hp.c3}55;
    pointer-events:none;mix-blend-mode:screen;
    animation:sig-dot-${anim} ${dotDuration}s ease-in-out infinite;
  `
  wrap.appendChild(dot)

  const tip = document.createElement('div')
  tip.style.cssText = `
    position:absolute;left:50%;bottom:calc(100% + ${dotR + 8}px);min-width:120px;
    transform:translateX(-50%) translateY(4px);padding:6px 10px;
    background:rgba(2,6,17,0.93);border:1px solid ${hp.c2}66;border-radius:10px;
    backdrop-filter:blur(16px);opacity:0;pointer-events:none;
    transition:opacity 0.18s,transform 0.18s;
    font-family:Inter,sans-serif;font-size:11px;font-weight:600;
    color:${hp.c2};white-space:nowrap;z-index:999;text-align:center;
    box-shadow:0 4px 20px rgba(0,0,0,0.7),0 0 12px ${hp.c1}33;
  `
  if (isFlood) {
    tip.innerHTML = `<span style="font-weight:700;color:#77d6ff;">${hp.label}</span><br/><span style="font-size:9.5px;color:#ff4444;font-weight:800;letter-spacing:0.5px;">⚠ Extreme Flood Risk</span>`
  } else {
    tip.textContent = hp.label
  }
  wrap.appendChild(tip)
  wrap.addEventListener('mouseenter', () => { tip.style.opacity = '1'; tip.style.transform = 'translateX(-50%) translateY(0)' })
  wrap.addEventListener('mouseleave', () => { tip.style.opacity = '0'; tip.style.transform = 'translateX(-50%) translateY(4px)' })
  return wrap
}

export function buildLocationPin(h, { setActiveRegion, flyTo }) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:relative;width:40px;height:40px;cursor:pointer'

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
      &nbsp;Â·&nbsp;Score <span style="color:${h.color};font-weight:700">${h.score}</span>/100
    </div>
    <div style="margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,255,255,0.08);font-size:10px;color:#4a5568;">Click to open inspector</div>
  `
  wrap.appendChild(tip)
  wrap.addEventListener('mouseenter', () => { tip.style.opacity = '1'; tip.style.transform = 'translateX(-50%) translateY(0)' })
  wrap.addEventListener('mouseleave', () => { tip.style.opacity = '0'; tip.style.transform = 'translateX(-50%) translateY(6px)' })
  wrap.addEventListener('click', (e) => {
    e.stopPropagation()
    setActiveRegion(h.id)
    flyTo(h.lat, h.lng, 1.8)
  })
  return wrap
}
