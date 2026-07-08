// /**
//  * constants.js — Shared data and utilities for the modular FloodLayer
//  */

// // ── Flood hotspot locations (lat, lng) ──────────────────────────────────────
// export const FLOOD_HOTSPOTS = [
//   [23.7,  90.4],   // Bangladesh
//   [30.0,  70.0],   // Pakistan
//   [20.0,  85.0],   // Eastern India
//   [52.3,   5.3],   // Netherlands
//   [36.0, -90.0],   // Mississippi
// ]

// // ── Water accumulation regions (lat, lng) ───────────────────────────────────
// export const FLOOD_REGIONS = [
//   [23.7,  90.4],   // Bangladesh
//   [30.0,  70.0],   // Pakistan
//   [22.0,  82.0],   // North India
//   [30.0, 115.0],   // China river basins
//   [-2.0, 115.0],   // Indonesia
//   [12.0, 122.0],   // Philippines
//   [-5.0, -60.0],   // Amazon Basin
//   [36.0, -90.0],   // Mississippi Basin
// ]

// /**
//  * Convert geographic (lat, lng) to a unit 3D direction vector in the LOCAL
//  * coordinate space of a Three.js Mesh that has `mesh.rotation.y = -Math.PI / 2`.
//  *
//  * Three.js SphereGeometry UV mapping:
//  *   U = (phi) / (2*PI), where phi = (lng + 180) / 180 * PI
//  *   V = vertex height from south pole
//  *
//  * Local position on the sphere surface:
//  *   x = -r * cos(phi) * sin(v * PI)
//  *   y =  r * cos(v * PI)
//  *   z =  r * sin(phi) * sin(v * PI)
//  *
//  * After the mesh rotation Y by -PI/2, world coords become:
//  *   worldX = -local_z, worldY = local_y, worldZ = local_x
//  */
// export function latLngToLocalDir(lat, lng) {
//   const phi  = (lng + 180) / 180 * Math.PI
//   const v    = (90 - lat) / 180
//   const sinV = Math.sin(v * Math.PI)
//   const cosV = Math.cos(v * Math.PI)
//   return {
//     x: -Math.cos(phi) * sinV,
//     y:  cosV,
//     z:  Math.sin(phi) * sinV,
//   }
// }

// /** Convert a local-space direction to world-space (accounting for Y rotation). */
// export function localToWorld(localDir, r = 1) {
//   return {
//     x: -localDir.z * r,
//     y:  localDir.y * r,
//     z:  localDir.x * r,
//   }
// }






/**
 * constants.js — Shared data and utilities for the modular FloodLayer
 */

// ── Flood hotspot locations (lat, lng) ──────────────────────────────────────
export const FLOOD_HOTSPOTS = [
  [23.7,  90.4],   // Bangladesh
  [30.0,  70.0],   // Pakistan
  [20.0,  85.0],   // Eastern India
  [52.3,   5.3],   // Netherlands
  [36.0, -90.0],   // Mississippi
]

// ── Water accumulation regions (lat, lng) ───────────────────────────────────
export const FLOOD_REGIONS = [
  [23.7,  90.4],   // Bangladesh
  [30.0,  70.0],   // Pakistan
  [22.0,  82.0],   // North India
  [30.0, 115.0],   // China river basins
  [-2.0, 115.0],   // Indonesia
  [12.0, 122.0],   // Philippines
  [-5.0, -60.0],   // Amazon Basin
  [36.0, -90.0],   // Mississippi Basin
]

/**
 * Convert geographic (lat, lng) to a unit 3D direction vector in the LOCAL
 * coordinate space of a Three.js Mesh that has `mesh.rotation.y = -Math.PI / 2`.
 */
export function latLngToLocalDir(lat, lng) {
  const phi  = (lng + 180) / 180 * Math.PI
  const v    = (90 - lat) / 180
  const sinV = Math.sin(v * Math.PI)
  const cosV = Math.cos(v * Math.PI)
  return {
    x: -Math.cos(phi) * sinV,
    y:  cosV,
    z:  Math.sin(phi) * sinV,
  }
}

/** Convert a local-space direction to world-space (accounting for Y rotation). */
export function localToWorld(localDir, r = 1) {
  return {
    x: -localDir.z * r,
    y:  localDir.y * r,
    z:  localDir.x * r,
  }
}