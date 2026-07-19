import { useEffect, useRef } from "react";
import * as THREE from "three";
import useClimateStore from "../../store/useClimateStore";
import { EARTH_DAY } from "./globeConstants";

export default function EarthCoreLayer({ scene }) {
  const activeLayer  = useClimateStore((s) => s.activeLayer);
  const isActive     = activeLayer === "earthCore";
  const refs         = useRef({ group: null, reqId: null, innerCore: null, outerCore: null, coreLight: null });

  useEffect(() => {
    const r = refs.current;

    // ── cleanup helper ─────────────────────────────────────────────────────────
    const cleanup = () => {
      if (r.reqId) { cancelAnimationFrame(r.reqId); r.reqId = null; }
      if (r.group && scene) {
        r.group.traverse((child) => {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
        scene.remove(r.group);
        r.group = null;
      }
    };

    if (!isActive) { cleanup(); return; }
    if (!scene)    { return; }
    cleanup(); // remove any stale group before rebuilding

    const group = new THREE.Group();
    r.group = group;
    scene.add(group);

    // ── LIGHTS ─────────────────────────────────────────────────────────────────
    // Ambient fills the scene so layers aren't pitch-black in shadow
    group.add(new THREE.AmbientLight(0xffeedd, 1.0));

    // Point light at the core simulates inner-core heat
    const coreLight = new THREE.PointLight(0xff9922, 12, 220, 1.6);
    coreLight.position.set(0, 0, 0);
    group.add(coreLight);
    r.coreLight = coreLight;

    // ── INNER CORE — solid iron & nickel, ~5,400 °C ────────────────────────────
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color:             0xfffde8,
      emissive:          0xffaa22,
      emissiveIntensity: 1.2,
      roughness:         0.05,
      metalness:         0.95,
    });
    const innerCoreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(28, 64, 64),
      innerCoreMat
    );
    group.add(innerCoreMesh);
    r.innerCore = innerCoreMesh;

    // Soft additive glow halo around inner core
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(42, 32, 32),
      new THREE.MeshBasicMaterial({
        color:      0xffcc44,
        transparent: true,
        opacity:     0.14,
        side:        THREE.BackSide,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
      })
    ));

    // ── OUTER CORE — liquid iron & nickel ──────────────────────────────────────
    const outerCoreMat = new THREE.MeshStandardMaterial({
      color:             0xff6600,
      emissive:          0xff3300,
      emissiveIntensity: 0.65,
      roughness:         0.20,
      metalness:         0.45,
    });
    const outerCoreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(55, 64, 64),
      outerCoreMat
    );
    group.add(outerCoreMesh);
    r.outerCore = outerCoreMesh;

    // ── MANTLE — semi-solid hot rock ───────────────────────────────────────────
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(89, 64, 64),
      new THREE.MeshStandardMaterial({
        color:             0xcc2200,
        emissive:          0x660000,
        emissiveIntensity: 0.22,
        roughness:         0.95,
        metalness:         0.0,
      })
    ));

    // ── CRUST — 3/4 sphere showing Earth surface texture ──────────────────────
    // phiLength = 1.5π leaves a 90° wedge open, revealing the inner layers
    const loader   = new THREE.TextureLoader();
    const earthTex = loader.load(EARTH_DAY, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; });
    earthTex.wrapS = THREE.RepeatWrapping;
    earthTex.repeat.set(0.75, 1);   // map ¾ of the texture to ¾ of the sphere

    const crustGeo  = new THREE.SphereGeometry(100.8, 128, 64, 0, Math.PI * 1.5);
    const crustMat  = new THREE.MeshStandardMaterial({
      map:        earthTex,
      roughness:  0.65,
      metalness:  0.08,
      side:       THREE.DoubleSide,
    });
    const crustMesh = new THREE.Mesh(crustGeo, crustMat);
    // Rotate so the open wedge faces the +X / -Z direction
    crustMesh.rotation.y = -Math.PI / 2;
    crustMesh.renderOrder = 1;
    group.add(crustMesh);

    // ── CROSS-SECTION CANVAS ───────────────────────────────────────────────────
    // Draw to a canvas, then apply as a texture on two half-circle flat faces
    // that cap the open edges of the 3/4 sphere.
    const canvas = document.createElement("canvas");
    canvas.width  = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const cx  = 512, cy = 512;

    // Draw concentric filled circles (largest = outermost layer, drawn first)
    const layerRings = [
      { r: 508, fill: "#5c3a21" },   // Crust  — brown
      { r: 447, fill: "#cc2200" },   // Mantle — deep red
      { r: 276, fill: "#ff6600" },   // Outer Core — orange
      { r: 140, fill: "#fffde8" },   // Inner Core — pale yellow
    ];
    layerRings.forEach(({ r: lr, fill }) => {
      ctx.beginPath();
      ctx.arc(cx, cy, lr, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Radial highlight on inner core for depth
    const innerGrad = ctx.createRadialGradient(cx - 35, cy - 35, 5, cx, cy, 140);
    innerGrad.addColorStop(0,   "rgba(255,255,255,0.45)");
    innerGrad.addColorStop(0.7, "rgba(255,200,80,0.10)");
    innerGrad.addColorStop(1,   "rgba(255,140,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    // Labels
    ctx.shadowColor = "rgba(0,0,0,0.95)";
    ctx.shadowBlur  = 10;
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 30px sans-serif"; ctx.fillStyle = "#ffffff";
    ctx.fillText("Inner Core", cx, cy - 28);
    ctx.font = "18px sans-serif"; ctx.fillStyle = "rgba(255,220,100,0.90)";
    ctx.fillText("~5,400 °C  ·  Solid Fe-Ni", cx, cy + 22);

    ctx.font = "bold 20px sans-serif"; ctx.fillStyle = "rgba(255,200,140,0.90)";
    ctx.fillText("Outer Core", cx - 215, cy - 170);
    ctx.font = "14px sans-serif"; ctx.fillStyle = "rgba(255,170,100,0.75)";
    ctx.fillText("Liquid Fe-Ni", cx - 215, cy - 148);

    ctx.font = "bold 19px sans-serif"; ctx.fillStyle = "rgba(255,160,130,0.85)";
    ctx.fillText("Mantle", cx + 38, cy - 368);
    ctx.font = "14px sans-serif"; ctx.fillStyle = "rgba(255,130,100,0.65)";
    ctx.fillText("Hot semi-solid rock", cx + 38, cy - 346);

    ctx.font = "bold 16px sans-serif"; ctx.fillStyle = "rgba(200,170,140,0.75)";
    ctx.fillText("Crust  (0 – 35 km)", cx + 38, cy - 470);

    const faceTex = new THREE.CanvasTexture(canvas);
    const faceMat = new THREE.MeshBasicMaterial({
      map:       faceTex,
      side:      THREE.DoubleSide,
      depthWrite: false,    // don't block inner spheres from rendering
    });

    // ── TWO FLAT CUT FACES ─────────────────────────────────────────────────────
    // After crustMesh.rotation.y = -π/2 the two open edges of the 3/4 sphere are:
    //   Edge A — in the x = 0 (YZ) plane, z ≤ 0 half
    //   Edge B — in the z = 0 (XY) plane, x ≥ 0 half
    //
    // CircleGeometry(r, segs, thetaStart=-π/2, thetaLength=π) gives the half-disc
    // on the +X side of the local XY plane.

    // Edge A: x = 0 plane, z ≤ 0 half  →  rotate 90° around +Y so +X → -Z
    const faceGeoA = new THREE.CircleGeometry(100.8, 128, -Math.PI / 2, Math.PI);
    const faceA    = new THREE.Mesh(faceGeoA, faceMat);
    faceA.rotation.y = Math.PI / 2;   // local +X half → world -Z half ✓
    faceA.renderOrder = 9;
    group.add(faceA);

    // Edge B: z = 0 plane, x ≥ 0 half  →  no rotation needed
    const faceGeoB = new THREE.CircleGeometry(100.8, 128, -Math.PI / 2, Math.PI);
    const faceB    = new THREE.Mesh(faceGeoB, faceMat.clone());
    faceB.renderOrder = 9;
    group.add(faceB);

    // ── INITIAL ORIENTATION ────────────────────────────────────────────────────
    // Tilt slightly so the camera sees the open wedge + some Earth surface at once
    group.rotation.x = Math.PI / 14;
    group.rotation.y = -Math.PI / 5;

    // ── ANIMATION ──────────────────────────────────────────────────────────────
    // No group rotation — let the camera orbit reveal the opening naturally.
    // Animate glowing/pulsing of the inner layers instead.
    const animate = () => {
      const rr = refs.current;
      if (!rr.group) return;
      const t = performance.now() * 0.001;

      // Inner core: scale pulse + emissive flicker
      if (rr.innerCore) {
        rr.innerCore.scale.setScalar(0.96 + 0.04 * Math.sin(t * 1.1));
        rr.innerCore.material.emissiveIntensity = 1.0 + 0.45 * Math.sin(t * 0.85);
      }

      // Outer core: slower shimmer (liquid motion illusion)
      if (rr.outerCore) {
        rr.outerCore.material.emissiveIntensity = 0.50 + 0.22 * Math.sin(t * 0.45 + 1.3);
      }

      // Core point light flicker
      if (rr.coreLight) {
        rr.coreLight.intensity = 9 + 4.5 * Math.sin(t * 0.7);
      }

      rr.reqId = requestAnimationFrame(animate);
    };
    animate();

    return cleanup;
  }, [isActive, scene]);

  return null;
}