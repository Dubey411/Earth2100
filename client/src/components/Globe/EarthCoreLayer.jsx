// import { useEffect, useRef } from "react";
// import * as THREE from "three";
// import useClimateStore from "../../store/useClimateStore";
// import { EARTH_DAY } from "./globeConstants";

// export default function EarthCoreLayer({ globe, scene }) {
//   const groupRef = useRef(null);
//   const activeLayer = useClimateStore((s) => s.activeLayer);
//   const isActive = activeLayer === 'earthCore';

//   useEffect(() => {
//     // ── Cleanup on deactivation ──────────────────────────────────────────
//     if (!isActive) {
//       if (groupRef.current && scene) {
//         scene.remove(groupRef.current);
//         groupRef.current = null;
//         console.log('🌍 EarthCoreLayer: Removed cutaway');
//       }
//       return;
//     }

//     if (!scene) {
//       console.warn('🌍 EarthCoreLayer: No scene provided');
//       return;
//     }

//     console.log('🌍 EarthCoreLayer: Building cutaway...');

//     // ── Remove existing group if any ────────────────────────────────────
//     if (groupRef.current) {
//       scene.remove(groupRef.current);
//       groupRef.current = null;
//     }

//     const group = new THREE.Group();
//     groupRef.current = group;
//     scene.add(group);

//     const loader = new THREE.TextureLoader();

//     // ─── 1. LOAD EARTH TEXTURE ───────────────────────────────────────────
//     const earthTex = loader.load(EARTH_DAY);
//     earthTex.colorSpace = THREE.SRGBColorSpace;
//     earthTex.wrapS = THREE.RepeatWrapping;
//     earthTex.repeat.set(0.75, 1);

//     // ─── 2. OUTER CRUST (3/4 sphere with Earth texture) ──────────────────
//     const crustGeo = new THREE.SphereGeometry(100.8, 64, 64, 0, Math.PI * 1.5);
//     const crustMat = new THREE.MeshStandardMaterial({
//       map: earthTex,
//       roughness: 0.7,
//       metalness: 0.1,
//       side: THREE.DoubleSide,
//     });
//     const crustMesh = new THREE.Mesh(crustGeo, crustMat);
//     crustMesh.rotation.y = -Math.PI / 2;
//     group.add(crustMesh);

//     // ─── 3. MANTLE (semi-transparent red-orange) ──────────────────────────
//     const mantleMat = new THREE.MeshStandardMaterial({
//       color: 0xff4136,
//       transparent: true,
//       opacity: 0.5,
//       roughness: 0.8,
//       side: THREE.DoubleSide,
//     });
//     const mantle = new THREE.Mesh(
//       new THREE.SphereGeometry(89, 48, 48, 0, Math.PI * 1.5),
//       mantleMat
//     );
//     mantle.rotation.y = -Math.PI / 2;
//     group.add(mantle);

//     // ─── 4. OUTER CORE (liquid orange) ────────────────────────────────────
//     const outerCoreMat = new THREE.MeshStandardMaterial({
//       color: 0xff851b,
//       emissive: 0xff5500,
//       emissiveIntensity: 0.15,
//       transparent: true,
//       opacity: 0.85,
//       roughness: 0.3,
//       side: THREE.DoubleSide,
//     });
//     const outerCore = new THREE.Mesh(
//       new THREE.SphereGeometry(55, 48, 48, 0, Math.PI * 1.5),
//       outerCoreMat
//     );
//     outerCore.rotation.y = -Math.PI / 2;
//     group.add(outerCore);

//     // ─── 5. INNER CORE (solid yellow-white with glow) ──────────────────────
//     const innerCoreMat = new THREE.MeshStandardMaterial({
//       color: 0xfffec8,
//       emissive: 0xffaa00,
//       emissiveIntensity: 0.4,
//       roughness: 0.2,
//       metalness: 0.8,
//       side: THREE.DoubleSide,
//     });
//     const innerCore = new THREE.Mesh(
//       new THREE.SphereGeometry(28, 48, 48, 0, Math.PI * 1.5),
//       innerCoreMat
//     );
//     innerCore.rotation.y = -Math.PI / 2;
//     group.add(innerCore);

//     // ─── 6. FLAT CUTAWAY FACE (concentric rings with labels) ──────────────
//     const canvas = document.createElement("canvas");
//     canvas.width = 2048;
//     canvas.height = 2048;
//     const ctx = canvas.getContext("2d");

//     const cx = 1024, cy = 1024;
//     const maxR = 1008; // 100.8 * 10

//     // Background (dark space)
//     ctx.fillStyle = "#0a0e1a";
//     ctx.fillRect(0, 0, 2048, 2048);

//     // Draw concentric rings
//     const rings = [
//       { radius: 280, color: "#fffec8", label: "Inner Core", sub: "~1,270 km radius • 5,400°C" },
//       { radius: 550, color: "#ff851b", label: "Outer Core", sub: "~2,200 km thick • Liquid iron & nickel" },
//       { radius: 890, color: "#ff4136", label: "Mantle", sub: "~2,900 km deep • Semi-solid hot rock" },
//       { radius: 990, color: "#5c3a21", label: "Crust", sub: "0–35 km • Thin outer layer" },
//     ];

//     rings.forEach(({ radius, color }) => {
//       ctx.beginPath();
//       ctx.arc(cx, cy, radius, 0, Math.PI * 2);
//       ctx.fillStyle = color;
//       ctx.fill();
//       // Add a subtle border
//       ctx.strokeStyle = "rgba(255,255,255,0.1)";
//       ctx.lineWidth = 2;
//       ctx.stroke();
//     });

//     // Add labels
//     ctx.textAlign = "center";
//     ctx.textBaseline = "middle";

//     // Inner Core label (center)
//     ctx.font = "bold 40px Inter, sans-serif";
//     ctx.fillStyle = "rgba(255,255,255,0.95)";
//     ctx.fillText("Inner Core", cx, cy - 60);
//     ctx.font = "26px Inter, sans-serif";
//     ctx.fillStyle = "rgba(255,255,255,0.6)";
//     ctx.fillText("~1,270 km radius", cx, cy + 40);
//     ctx.fillStyle = "rgba(255,200,100,0.8)";
//     ctx.fillText("5,400°C", cx, cy + 90);

//     // Outer Core label
//     ctx.font = "bold 28px Inter, sans-serif";
//     ctx.fillStyle = "rgba(255,255,255,0.7)";
//     ctx.fillText("Outer Core", 760, 400);
//     ctx.font = "18px Inter, sans-serif";
//     ctx.fillStyle = "rgba(255,255,255,0.5)";
//     ctx.fillText("Liquid iron & nickel", 760, 440);

//     // Mantle label
//     ctx.font = "bold 28px Inter, sans-serif";
//     ctx.fillStyle = "rgba(255,255,255,0.6)";
//     ctx.fillText("Mantle", 1120, 250);
//     ctx.font = "18px Inter, sans-serif";
//     ctx.fillStyle = "rgba(255,255,255,0.4)";
//     ctx.fillText("Hot rock flowing", 1120, 290);

//     // Crust label
//     ctx.font = "bold 22px Inter, sans-serif";
//     ctx.fillStyle = "rgba(255,255,255,0.5)";
//     ctx.fillText("Crust", 1350, 150);

//     const faceTexture = new THREE.CanvasTexture(canvas);
//     faceTexture.colorSpace = THREE.SRGBColorSpace;

//     const faceMat = new THREE.MeshBasicMaterial({
//       map: faceTexture,
//       side: THREE.DoubleSide,
//       transparent: true,
//     });

//     // Two flat faces to cap the cut
//     const faceGeo = new THREE.RingGeometry(0, 100.8, 64, 1, 0, Math.PI);
    
//     const face1 = new THREE.Mesh(faceGeo, faceMat);
//     face1.rotation.x = -Math.PI / 2;
//     face1.rotation.y = -Math.PI / 2;
//     group.add(face1);

//     const face2 = new THREE.Mesh(faceGeo.clone(), faceMat);
//     face2.rotation.x = -Math.PI / 2;
//     group.add(face2);

//     // ─── 7. POSITION AND TILT ──────────────────────────────────────────────
//     // Tilt so the cutaway faces the camera at a nice angle
//     group.rotation.x = Math.PI / 12;
//     group.rotation.y = Math.PI / 4;

//     // ─── 8. ANIMATION ──────────────────────────────────────────────────────
//     let reqId = null;
//     const animate = () => {
//       if (groupRef.current && isActive) {
//         // Slow rotation
//         groupRef.current.rotation.y += 0.0012;
//         // Core pulse
//         const pulse = 1 + 0.003 * Math.sin(performance.now() / 2000);
//         innerCore.scale.set(pulse, pulse, pulse);
//         innerCore.material.emissiveIntensity = 0.3 + 0.15 * Math.sin(performance.now() / 1500);
//       }
//       reqId = requestAnimationFrame(animate);
//     };
//     animate();

//     // ─── 9. CLEANUP ──────────────────────────────────────────────────────────
//     return () => {
//       if (reqId) cancelAnimationFrame(reqId);
//       if (groupRef.current && scene) {
//         scene.remove(groupRef.current);
//         groupRef.current = null;
//       }
//       // Dispose geometries and materials
//       crustGeo.dispose();
//       crustMat.dispose();
//       earthTex.dispose();
//       mantle.geometry.dispose();
//       mantle.material.dispose();
//       outerCore.geometry.dispose();
//       outerCore.material.dispose();
//       innerCore.geometry.dispose();
//       innerCore.material.dispose();
//       faceGeo.dispose();
//       faceMat.dispose();
//       faceTexture.dispose();
//       console.log('🌍 EarthCoreLayer: Cleaned up');
//     };
//   }, [isActive, scene]);

//   return null;
// }




import { useEffect, useRef } from "react";
import * as THREE from "three";
import useClimateStore from "../../store/useClimateStore";
import { EARTH_DAY } from "./globeConstants";

export default function EarthCoreLayer({ globe, scene }) {
  const groupRef = useRef(null);
  const activeLayer = useClimateStore((s) => s.activeLayer);
  const isActive = activeLayer === 'earthCore';

  useEffect(() => {
    if (!isActive) {
      if (groupRef.current && scene) {
        scene.remove(groupRef.current);
        groupRef.current = null;
      }
      return;
    }

    if (!scene) {
      console.warn('🌍 EarthCoreLayer: No scene provided');
      return;
    }

    console.log('🌍 EarthCoreLayer: Building cutaway with visible core...');

    if (groupRef.current) {
      scene.remove(groupRef.current);
      groupRef.current = null;
    }

    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    const loader = new THREE.TextureLoader();

    // ─── 1. LOAD EARTH TEXTURE ───────────────────────────────────────────
    const earthTex = loader.load(EARTH_DAY);
    earthTex.colorSpace = THREE.SRGBColorSpace;
    earthTex.wrapS = THREE.RepeatWrapping;
    earthTex.repeat.set(0.75, 1);

    // ─── 2. OUTER CRUST (3/4 sphere) ──────────────────────────────────────
    const crustGeo = new THREE.SphereGeometry(100.8, 64, 64, 0, Math.PI * 1.5);
    const crustMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const crustMesh = new THREE.Mesh(crustGeo, crustMat);
    crustMesh.rotation.y = -Math.PI / 2;
    crustMesh.renderOrder = 0;
    group.add(crustMesh);

    // ─── 3. INNER CORE (solid, bright, visible) ──────────────────────────
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0xfffec8,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });
    const innerCore = new THREE.Mesh(
      new THREE.SphereGeometry(28, 48, 48, 0, Math.PI * 1.5),
      innerCoreMat
    );
    innerCore.rotation.y = -Math.PI / 2;
    innerCore.renderOrder = 1;
    group.add(innerCore);

    // ─── 4. OUTER CORE (liquid orange, glowing) ──────────────────────────
    const outerCoreMat = new THREE.MeshStandardMaterial({
      color: 0xff851b,
      emissive: 0xff5500,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const outerCore = new THREE.Mesh(
      new THREE.SphereGeometry(55, 48, 48, 0, Math.PI * 1.5),
      outerCoreMat
    );
    outerCore.rotation.y = -Math.PI / 2;
    outerCore.renderOrder = 1;
    group.add(outerCore);

    // ─── 5. MANTLE (semi-transparent) ────────────────────────────────────
    const mantleMat = new THREE.MeshStandardMaterial({
      color: 0xff4136,
      transparent: true,
      opacity: 0.4,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const mantle = new THREE.Mesh(
      new THREE.SphereGeometry(89, 48, 48, 0, Math.PI * 1.5),
      mantleMat
    );
    mantle.rotation.y = -Math.PI / 2;
    mantle.renderOrder = 1;
    group.add(mantle);

    // ─── 6. FLAT CUTAWAY FACE (drawn LAST so it's on top) ────────────────
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d");

    const cx = 1024, cy = 1024;

    // Dark background
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, 2048, 2048);

    // Draw concentric rings
    const rings = [
      { radius: 280, color: "#fffec8", label: "Inner Core" },
      { radius: 550, color: "#ff851b", label: "Outer Core" },
      { radius: 890, color: "#ff4136", label: "Mantle" },
      { radius: 990, color: "#5c3a21", label: "Crust" },
    ];

    rings.forEach(({ radius, color }) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Labels on the cut face
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 36px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText("Inner Core", cx, cy - 50);
    ctx.font = "22px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,200,100,0.8)";
    ctx.fillText("5,400°C · Solid iron-nickel", cx, cy + 50);

    ctx.font = "bold 24px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Outer Core", 760, 380);
    ctx.fillText("Mantle", 1120, 230);

    const faceTexture = new THREE.CanvasTexture(canvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;

    const faceMat = new THREE.MeshBasicMaterial({
      map: faceTexture,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const faceGeo = new THREE.RingGeometry(0, 100.8, 64, 1, 0, Math.PI);
    
    const face1 = new THREE.Mesh(faceGeo, faceMat);
    face1.rotation.x = -Math.PI / 2;
    face1.rotation.y = -Math.PI / 2;
    face1.renderOrder = 10; // ← RENDER ON TOP
    group.add(face1);

    const face2 = new THREE.Mesh(faceGeo.clone(), faceMat);
    face2.rotation.x = -Math.PI / 2;
    face2.renderOrder = 10; // ← RENDER ON TOP
    group.add(face2);

    // ─── 7. POSITION & TILT ──────────────────────────────────────────────
    group.rotation.x = Math.PI / 12;
    group.rotation.y = Math.PI / 4;

    // ─── 8. ANIMATION ──────────────────────────────────────────────────────
    let reqId = null;
    const animate = () => {
      if (groupRef.current && isActive) {
        groupRef.current.rotation.y += 0.0012;
        const pulse = 1 + 0.003 * Math.sin(performance.now() / 2000);
        innerCore.scale.set(pulse, pulse, pulse);
        innerCore.material.emissiveIntensity = 0.4 + 0.2 * Math.sin(performance.now() / 1500);
      }
      reqId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (reqId) cancelAnimationFrame(reqId);
      if (groupRef.current && scene) {
        scene.remove(groupRef.current);
        groupRef.current = null;
      }
      // Cleanup...
      crustGeo.dispose();
      crustMat.dispose();
      earthTex.dispose();
      mantle.geometry.dispose();
      mantle.material.dispose();
      outerCore.geometry.dispose();
      outerCore.material.dispose();
      innerCore.geometry.dispose();
      innerCore.material.dispose();
      faceGeo.dispose();
      faceMat.dispose();
      faceTexture.dispose();
    };
  }, [isActive, scene]);

  return null;
}