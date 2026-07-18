import { useEffect, useRef } from "react";
import * as THREE from "three";
import useClimateStore from "../../store/useClimateStore";
import { EARTH_DAY } from "./globeConstants";

export default function EarthCoreLayer({ scene }) {
  const groupRef = useRef(null);
  const activeLayer = useClimateStore((s) => s.activeLayer);
  const isActive = activeLayer === 'earthCore';

  useEffect(() => {
    if (!isActive || !scene) return;

    // 1. Create a parent group to hold the cutaway model
    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    const loader = new THREE.TextureLoader();

    // 2. Add 3/4 Sphere for Earth Surface (to make the cut look like a 90-degree slice missing)
    // Using phiStart = 0, phiLength = Math.PI * 1.5 leaves a 90-degree quarter slice open.
    const earthGeo = new THREE.SphereGeometry(99.6, 64, 64, 0, Math.PI * 1.5);
    
    // We must adjust the texture UV mapping so the Earth map maps correctly without stretching.
    // By default, Three.js maps the whole texture horizontally.
    // If we map the day texture, we repeat it so 1.0 repeat maps to full 2PI,
    // which means for a 1.5PI length, we repeat 0.75 of the texture.
    const earthTex = loader.load(EARTH_DAY, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.set(0.75, 1);
    });

    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.y = -Math.PI / 2; // Orient correctly
    group.add(earthMesh);

    // 3. Create the flat cutaway faces (two flat half-discs capping the open slice)
    // One face at phi = 0, one face at phi = 1.5 * PI.
    // Center is at 0,0,0. Radius is 99.6.
    
    // Let's generate a high-res canvas texture showing the concentric interior layers
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const cx = 512;
    const cy = 512;

    // Clear background
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 1024, 1024);

    // Draw Crust (brown outer ring)
    ctx.beginPath();
    ctx.arc(cx, cy, 508, 0, Math.PI * 2);
    ctx.fillStyle = "#5c3a21"; // Brown Crust
    ctx.fill();

    // Draw Mantle (bright red-orange)
    ctx.beginPath();
    ctx.arc(cx, cy, 498, 0, Math.PI * 2);
    ctx.fillStyle = "#ff4136"; 
    ctx.fill();

    // Draw Outer Core (molten orange-yellow)
    ctx.beginPath();
    ctx.arc(cx, cy, 300, 0, Math.PI * 2);
    ctx.fillStyle = "#ff851b";
    ctx.fill();

    // Draw Inner Core (solid bright yellow/white)
    ctx.beginPath();
    ctx.arc(cx, cy, 150, 0, Math.PI * 2);
    ctx.fillStyle = "#fffec8";
    ctx.fill();

    // Add glowing rings inside the core
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 148, 0, Math.PI * 2);
    ctx.stroke();

    const coreTexture = new THREE.CanvasTexture(canvas);
    coreTexture.colorSpace = THREE.SRGBColorSpace;

    const coreMat = new THREE.MeshBasicMaterial({
      map: coreTexture,
      side: THREE.DoubleSide
    });

    // Face 1: Plane at Z = 0 (extends along X >= 0)
    // We create a half-circle geometry
    const face1Geo = new THREE.RingGeometry(0, 99.6, 64, 1, 0, Math.PI);
    const face1Mesh = new THREE.Mesh(face1Geo, coreMat);
    // Align face to cap the X-axis cut
    face1Mesh.rotation.x = Math.PI / 2;
    face1Mesh.rotation.y = Math.PI / 2;
    group.add(face1Mesh);

    // Face 2: Plane at X = 0 (extends along Z >= 0)
    const face2Geo = new THREE.RingGeometry(0, 99.6, 64, 1, 0, Math.PI);
    const face2Mesh = new THREE.Mesh(face2Geo, coreMat);
    // Align face to cap the Z-axis cut
    face2Mesh.rotation.x = Math.PI / 2;
    group.add(face2Mesh);

    // Angled orientation so student can see both the outside continents and the cutaway inside
    group.rotation.y = Math.PI / 3;
    group.rotation.x = Math.PI / 8;

    // 4. Add subtle animation to rotate slowly so all angles are visible
    let reqId = null;
    const animate = () => {
      if (groupRef.current) {
        groupRef.current.rotation.y += 0.0018;
      }
      reqId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (reqId) cancelAnimationFrame(reqId);
      scene.remove(group);
      earthGeo.dispose();
      earthMat.dispose();
      earthTex.dispose();
      face1Geo.dispose();
      face2Geo.dispose();
      coreMat.dispose();
      coreTexture.dispose();
    };
  }, [isActive, scene]);

  return null;
}
