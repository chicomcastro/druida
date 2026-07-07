import * as THREE from 'three';
import { FAUNA_BY_BIOME, type FaunaDef } from '../data/fauna.js';

/**
 * Modelo em blocos da fauna, com silhueta PRÓPRIA por espécie (ADR 0103):
 * chifres do cervo, orelhas da lebre, asas da ave/libélula, corpo achatado do
 * sapo, etc. Extraído do FaunaManager (ADR 0159) para ser reusável — o jogo e a
 * vitrine de modelos (showcase) constroem o bicho pela mesma função.
 */
export function buildFaunaModel(def: FaunaDef): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.9 });
  const acc = new THREE.MeshStandardMaterial({ color: def.accent, roughness: 0.9 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const box = (w, h, d, x, y, z, m) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    me.position.set(x, y, z); me.castShadow = true; g.add(me); return me;
  };
  const id = def.id;
  if (id === 'corvo' || id === 'libelula') {
    // Ave/inseto: corpo pequeno + asas; voa (bob alto no update).
    box(0.4, 0.32, 0.7, 0, 0.7, 0, body);
    box(0.7, 0.06, 0.4, -0.5, 0.76, 0.05, acc);
    box(0.7, 0.06, 0.4, 0.5, 0.76, 0.05, acc);
    box(0.3, 0.3, 0.3, 0, 0.88, 0.42, acc);
    if (id === 'corvo') box(0.1, 0.1, 0.26, 0, 0.86, 0.62, bone); // bico
    else { box(0.6, 0.05, 0.35, -0.45, 0.74, -0.32, acc); box(0.6, 0.05, 0.35, 0.45, 0.74, -0.32, acc); } // 2º par
  } else if (id === 'sapo') {
    box(0.72, 0.3, 0.6, 0, 0.24, 0, body);              // corpo largo/baixo
    box(0.44, 0.3, 0.34, 0, 0.36, 0.3, body);
    box(0.14, 0.14, 0.08, -0.14, 0.46, 0.42, acc); box(0.14, 0.14, 0.08, 0.14, 0.46, 0.42, acc); // olhos saltados
    box(0.2, 0.18, 0.3, -0.36, 0.14, -0.16, body); box(0.2, 0.18, 0.3, 0.36, 0.14, -0.16, body); // coxas
  } else {
    // Quadrúpede base + features por espécie.
    box(0.5, 0.4, 0.95, 0, 0.5, 0, body);
    const head = box(0.36, 0.36, 0.36, 0, 0.72, 0.56, acc);
    for (const [lx, lz] of [[-0.18, -0.32], [0.18, -0.32], [-0.18, 0.34], [0.18, 0.34]]) box(0.12, 0.42, 0.12, lx, 0.2, lz, body);
    box(0.1, 0.1, 0.05, -0.1, 0.76, 0.74, dark); box(0.1, 0.1, 0.05, 0.1, 0.76, 0.74, dark); // olhos
    if (id === 'cervo') {
      box(0.06, 0.42, 0.06, -0.12, 1.05, 0.5, bone); box(0.06, 0.42, 0.06, 0.12, 1.05, 0.5, bone);
      box(0.28, 0.06, 0.06, -0.2, 1.22, 0.5, bone); box(0.28, 0.06, 0.06, 0.2, 1.22, 0.5, bone); // galhadas
      head.position.z += 0.05; head.position.y += 0.06;
    } else if (id === 'lebre' || id === 'lebre_cinza') {
      box(0.1, 0.44, 0.08, -0.1, 1.02, 0.5, acc); box(0.1, 0.44, 0.08, 0.1, 1.02, 0.5, acc); // orelhas longas
    } else if (id === 'cabra') {
      box(0.08, 0.24, 0.08, -0.13, 0.98, 0.5, bone); box(0.08, 0.24, 0.08, 0.13, 0.98, 0.5, bone); // chifres
      box(0.12, 0.18, 0.1, 0, 0.6, 0.72, acc); // barbicha/focinho
    } else if (id === 'coruja') {
      box(0.42, 0.42, 0.32, 0, 0.78, 0.32, acc); // cabeça grande redonda
      box(0.15, 0.15, 0.06, -0.11, 0.82, 0.5, bone); box(0.15, 0.15, 0.06, 0.11, 0.82, 0.5, bone);
      box(0.07, 0.07, 0.05, -0.11, 0.82, 0.54, dark); box(0.07, 0.07, 0.05, 0.11, 0.82, 0.54, dark); // olhos grandes
    }
  }
  g.scale.setScalar(def.size);
  return g;
}

/** Lookup id → def (1ª ocorrência) — usado pela vitrine e por buildMesh. */
export const FAUNA_DEFS: Record<string, FaunaDef> = (() => {
  const m: Record<string, FaunaDef> = {};
  for (const list of Object.values(FAUNA_BY_BIOME)) for (const d of list) if (!m[d.id]) m[d.id] = d;
  return m;
})();
