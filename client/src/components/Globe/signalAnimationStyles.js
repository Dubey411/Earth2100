export const SIGNAL_ANIMATION_STYLES = `
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
