/**
 * Geometrias voxel compartilhadas (ADR 0074): clusters de caixas fundidos em
 * uma única BufferGeometry — 1 draw call por pool instanciado, silhueta 100%
 * cúbica como no Minecraft Dungeons. Todas as formas são ancoradas na base
 * (y=0 no chão) e axis-aligned; a variação vem de escala/cor por instância.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface BoxSpec { w: number; h: number; d: number; x: number; y: number; z: number }

/** Funde uma lista de caixas {w,h,d,x,y,z} numa geometria única. */
export function mergeBoxes(specs: BoxSpec[]) {
  const parts = specs.map((s) => {
    const g = new THREE.BoxGeometry(s.w, s.h, s.d);
    g.translate(s.x, s.y, s.z);
    return g;
  });
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return merged;
}

/** Copa de árvore: núcleo + cubos satélites (irregular mas cúbica). Centro ~y=0. */
export function canopyGeo() {
  return mergeBoxes([
    { w: 2.4, h: 1.9, d: 2.4, x: 0, y: 0, z: 0 },
    { w: 1.3, h: 1.2, d: 1.3, x: 1.15, y: 0.5, z: 0.3 },
    { w: 1.1, h: 1.0, d: 1.1, x: -1.0, y: 0.35, z: -0.55 },
    { w: 1.0, h: 0.9, d: 1.0, x: 0.2, y: 1.15, z: 0.75 },
    { w: 0.9, h: 0.8, d: 0.9, x: -0.45, y: 1.0, z: 0.9 },
  ]);
}

/** Pinheiro: torre de camadas quadradas decrescentes, base em y=0. */
export function pineGeo() {
  return mergeBoxes([
    { w: 2.2, h: 1.1, d: 2.2, x: 0, y: 0.55, z: 0 },
    { w: 1.6, h: 1.0, d: 1.6, x: 0, y: 1.5, z: 0 },
    { w: 1.0, h: 0.9, d: 1.0, x: 0, y: 2.35, z: 0 },
    { w: 0.5, h: 0.6, d: 0.5, x: 0, y: 3.05, z: 0 },
  ]);
}

/** Rocha: aglomerado de blocos baixos, base em y=0. */
export function rockGeo() {
  return mergeBoxes([
    { w: 1.3, h: 0.85, d: 1.1, x: 0, y: 0.42, z: 0 },
    { w: 0.7, h: 0.5, d: 0.7, x: 0.6, y: 0.25, z: 0.35 },
    { w: 0.55, h: 1.0, d: 0.55, x: -0.42, y: 0.5, z: -0.3 },
  ]);
}
