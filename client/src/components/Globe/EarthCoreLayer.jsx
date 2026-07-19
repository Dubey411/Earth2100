import { useEffect, useRef } from "react";
import * as THREE from "three";
import useClimateStore from "../../store/useClimateStore";
import { EARTH_DAY } from "./globeConstants";

export default function EarthCoreLayer({ scene }) {
  const activeLayer = useClimateStore((s) => s.activeLayer);
  const isActive    = activeLayer === "earthCore";
  const refs        = useRef({ group: null, reqId: null, innerCore: null, outerCore: null, coreLight: null });

  useEffect(() => {
    const r = refs.current;

    // ── cleanup ────────────────────────────────────────────────────────────────
    const cleanup = () => {
      if (r.reqId) { cancelAnimationFrame(r.reqId); r.reqId = null; }
      if (r.group && scene) {
        r.group.traverse((child) => {
          child.geometry?.dispose();
          if (child.material) {
            (Array.isArray(child.material) ? child.material : [child.material]).forEach((m) => m.dispose());
          }
        });
        scene.remove(r.group);
        r.group = null;
      }
    };

    if (!isActive) { cleanup(); return; }
    if (!scene)    return;
    cleanup();

    const group = new THREE.Group();
    r.group = group;
    scene.add(group);

    // ── LIGHTS ─────────────────────────────────────────────────────────────────
    group.add(new THREE.AmbientLight(0xffeedd, 1.2));
    const coreLight = new THREE.PointLight(0xff9922, 14, 240, 1.5);
    group.add(coreLight);
    r.coreLight = coreLight;

    // ── WHY depthTest:false? ───────────────────────────────────────────────────
    // react-globe.gl renders a full solid sphere at radius ~100.
    // Our inner layers sit at radii 28/55/89, which are BEHIND that sphere in
    // the depth buffer — completely invisible by default.
    //
    // Strategy: render inner layers without depth-testing (they always draw),
    // then render the 3/4-sphere crust at a higher renderOrder so it paints
    // over the inner layers in the 270° covered region.  In the 90° open wedge
    // the crust has no geometry, so the inner layers remain visible there.

    const layer = (radius, color, emissive, emissiveIntensity, roughness, metalness, order) => {
      const mat  = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, roughness, metalness });
      mat.depthTest  = false;
      mat.depthWrite = false;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), mat);
      mesh.renderOrder = order;
      group.add(mesh);
      return mesh;
    };

    // Render order: mantle first → outer core on top → inner core on top → crust last
    layer(89, 0xcc2200, 0x660000, 0.22, 0.95, 0.00, 5);               // Mantle
    const outerCoreMesh = layer(55, 0xff6600, 0xff3300, 0.65, 0.20, 0.45, 6); // Outer Core
    const innerCoreMesh = layer(28, 0xfffde8, 0xffaa22, 1.20, 0.05, 0.95, 7); // Inner Core
    r.outerCore = outerCoreMesh;
    r.innerCore = innerCoreMesh;

    // Soft additive glow halo around inner core
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44, transparent: true, opacity: 0.16,
      side: THREE.BackSide, blending: THREE.AdditiveBlending,
      depthTest: false, depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(42, 32, 32), glowMat);
    glowMesh.renderOrder = 7;
    group.add(glowMesh);

    // ── CRUST — 3/4 sphere, renderOrder 8 (covers inner layers in 270° area) ──
    const loader   = new THREE.TextureLoader();
    const earthTex = loader.load(EARTH_DAY, (t) => { t.colorSpace = THREE.SRGBColorSpace; });
    earthTex.wrapS = THREE.RepeatWrapping;
    earthTex.repeat.set(0.75, 1);

    const crustMat = new THREE.MeshStandardMaterial({
      map: earthTex, roughness: 0.65, metalness: 0.08, side: THREE.DoubleSide,
    });
    crustMat.depthTest  = false;
    crustMat.depthWrite = true;

    const crustMesh = new THREE.Mesh(
      new THREE.SphereGeometry(100.8, 128, 64, 0, Math.PI * 1.5),
      crustMat
    );
    crustMesh.rotation.y  = -Math.PI / 2;  // open wedge → +X / -Z direction
    crustMesh.renderOrder = 8;
    group.add(crustMesh);

    // ── CROSS-SECTION CANVAS ───────────────────────────────────────────────────
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const cx = 512, cy = 512;

    // Filled concentric circles — largest (crust) first so inner rings draw on top
    [
      { r: 508, fill: "#5c3a21" },
      { r: 447, fill: "#cc2200" },
      { r: 276, fill: "#ff6600" },
      { r: 140, fill: "#fffde8" },
    ].forEach(({ r: lr, fill }) => {
      ctx.beginPath();
      ctx.arc(cx, cy, lr, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth   = 3;
      ctx.stroke();
    });

    // Inner-core highlight gradient
    const g = ctx.createRadialGradient(cx - 35, cy - 35, 4, cx, cy, 140);
    g.addColorStop(0,   "rgba(255,255,255,0.45)");
    g.addColorStop(0.7, "rgba(255,200,80,0.10)");
    g.addColorStop(1,   "rgba(255,140,0,0)");
    ctx.beginPath(); ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    // Labels
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 10;

    ctx.font = "bold 30px sans-serif"; ctx.fillStyle = "#fff";
    ctx.fillText("Inner Core", cx, cy - 28);
    ctx.font = "18px sans-serif"; ctx.fillStyle = "rgba(255,220,100,.9)";
    ctx.fillText("~5,400 °C  ·  Solid Fe-Ni", cx, cy + 24);

    ctx.font = "bold 20px sans-serif"; ctx.fillStyle = "rgba(255,200,140,.9)";
    ctx.fillText("Outer Core", cx - 215, cy - 168);
    ctx.font = "14px sans-serif"; ctx.fillStyle = "rgba(255,170,100,.75)";
    ctx.fillText("Liquid Fe-Ni", cx - 215, cy - 146);

    ctx.font = "bold 19px sans-serif"; ctx.fillStyle = "rgba(255,160,130,.85)";
    ctx.fillText("Mantle", cx + 38, cy - 368);
    ctx.font = "14px sans-serif"; ctx.fillStyle = "rgba(255,130,100,.65)";
    ctx.fillText("Hot semi-solid rock", cx + 38, cy - 346);

    ctx.font = "bold 16px sans-serif"; ctx.fillStyle = "rgba(200,170,140,.75)";
    ctx.fillText("Crust  (0 – 35 km)", cx + 38, cy - 470);

    const faceTex = new THREE.CanvasTexture(canvas);
    const faceMat = new THREE.MeshBasicMaterial({
      map: faceTex, side: THREE.DoubleSide,
      depthTest: false, depthWrite: false,
    });

    // ── TWO CUT FACES (half-circle discs capping the open edges) ──────────────
    // After crustMesh.rotation.y = -π/2 the two open edges are:
    //   Edge A: x = 0 plane, z ≤ 0 half  →  rotate face by +π/2 around Y
    //   Edge B: z = 0 plane, x ≥ 0 half  →  no rotation
    //
    // CircleGeometry(r, segs, thetaStart=-π/2, thetaLength=π) = the x ≥ 0 half-disc.

    const makeHalfDisc = () => new THREE.CircleGeometry(100.8, 128, -Math.PI / 2, Math.PI);

    const faceA = new THREE.Mesh(makeHalfDisc(), faceMat);
    faceA.rotation.y  = Math.PI / 2;   // YZ plane, z ≤ 0 half
    faceA.renderOrder = 9;
    group.add(faceA);

    const faceB = new THREE.Mesh(makeHalfDisc(), faceMat.clone());
    faceB.renderOrder = 9;              // XY plane, x ≥ 0 half (no rotation)
    group.add(faceB);

    // ── INITIAL ORIENTATION ─────────────────────────────────────────────────────
    group.rotation.x = Math.PI / 14;
    group.rotation.y = -Math.PI / 5;

    // ── ANIMATION — pulsing glow only (no group rotation) ──────────────────────
    const animate = () => {
      const rr = refs.current;
      if (!rr.group) return;
      const t = performance.now() * 0.001;

      if (rr.innerCore) {
        rr.innerCore.scale.setScalar(0.96 + 0.04 * Math.sin(t * 1.1));
        rr.innerCore.material.emissiveIntensity = 1.0 + 0.45 * Math.sin(t * 0.85);
      }
      if (rr.outerCore) {
        rr.outerCore.material.emissiveIntensity = 0.50 + 0.22 * Math.sin(t * 0.45 + 1.3);
      }
      if (rr.coreLight) {
        rr.coreLight.intensity = 10 + 5 * Math.sin(t * 0.7);
      }

      rr.reqId = requestAnimationFrame(animate);
    };
    animate();

    return cleanup;
  }, [isActive, scene]);

  return null;
}