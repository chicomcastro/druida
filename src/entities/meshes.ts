import * as THREE from 'three';
import { getModel } from './modelLoader.js';
import { buildVoxelModel } from './voxelModels.js';

/**
 * Meshes dos personagens/inimigos. Prioridade: (1) modelo .glb carregado, se
 * registrado; (2) modelo voxel data-driven (estilo MC Dungeons, com partes
 * nomeadas para animação — ver voxelModels.ts); (3) caixas legadas (fallback).
 * O RenderSyncSystem só liga Transform -> object3d, então nada mais muda.
 */
function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function humanoid(robe, skin) {
  const g = new THREE.Group();
  g.add(box(0.7, 0.9, 0.5, robe, 0, 0.85, 0)); // tronco/manto
  g.add(box(0.45, 0.45, 0.45, skin, 0, 1.55, 0)); // cabeça
  g.add(box(0.25, 0.5, 0.25, robe, -0.45, 0.95, 0)); // braço
  g.add(box(0.25, 0.5, 0.25, robe, 0.45, 0.95, 0));
  // pequeno marcador frontal para indicar direção
  g.add(box(0.15, 0.15, 0.15, 0xffe08a, 0, 1.55, 0.28));
  return g;
}

const builders = {
  druid: () => humanoid(0x4f8f3f, 0xdcb892),

  wolf: () => {
    const g = new THREE.Group();
    g.add(box(0.6, 0.5, 1.1, 0x8c8c98, 0, 0.45, 0));
    g.add(box(0.4, 0.4, 0.4, 0x9aa0ad, 0, 0.6, 0.7));
    g.add(box(0.12, 0.12, 0.4, 0x6f7480, 0, 0.45, -0.75)); // cauda
    return g;
  },

  bear: () => {
    const g = new THREE.Group();
    g.add(box(1.1, 1.0, 1.4, 0x6b4a2f, 0, 0.7, 0));
    g.add(box(0.6, 0.6, 0.6, 0x7c5636, 0, 1.1, 0.7));
    return g;
  },

  raven: () => {
    const g = new THREE.Group();
    g.add(box(0.4, 0.4, 0.7, 0x2b2b35, 0, 0.9, 0));
    g.add(box(0.9, 0.08, 0.4, 0x1d1d26, 0, 0.95, 0)); // asas
    return g;
  },

  frog: () => {
    const g = new THREE.Group();
    g.add(box(0.7, 0.4, 0.7, 0x5aa64a, 0, 0.3, 0));
    g.add(box(0.18, 0.18, 0.18, 0xffe08a, -0.18, 0.5, 0.3));
    g.add(box(0.18, 0.18, 0.18, 0xffe08a, 0.18, 0.5, 0.3));
    return g;
  },

  // Inimigos
  rotboar: () => {
    const g = new THREE.Group();
    g.add(box(0.9, 0.7, 1.3, 0x5a4633, 0, 0.55, 0));
    g.add(box(0.5, 0.5, 0.5, 0x6e5a44, 0, 0.7, 0.7));
    g.add(box(0.1, 0.3, 0.1, 0xe8e0c8, 0, 0.6, 1.0)); // presa
    return g;
  },
  shadecrow: () => {
    const g = new THREE.Group();
    g.add(box(0.4, 0.5, 0.5, 0x33203a, 0, 0.9, 0));
    g.add(box(0.8, 0.08, 0.35, 0x4a2f57, 0, 1.0, 0));
    return g;
  },
  fungling: () => {
    const g = new THREE.Group();
    g.add(box(0.5, 0.5, 0.5, 0x7a5d8a, 0, 0.35, 0));
    g.add(box(0.7, 0.25, 0.7, 0xb06bd0, 0, 0.7, 0)); // chapéu
    return g;
  },
  husk: () => {
    const g = new THREE.Group();
    g.add(box(0.8, 1.3, 0.6, 0x4b3a2a, 0, 1.0, 0));
    g.add(box(0.5, 0.5, 0.5, 0x5c4836, 0, 1.7, 0));
    return g;
  },
  shaman: () => {
    const g = new THREE.Group();
    g.add(box(0.7, 1.1, 0.5, 0x3a5a3a, 0, 0.95, 0));
    g.add(box(0.45, 0.45, 0.45, 0xb8d0a0, 0, 1.6, 0));
    g.add(box(0.1, 1.4, 0.1, 0x8a6a3a, 0.5, 1.0, 0)); // cajado
    return g;
  },
  // Chefe
  rotlord: () => {
    const g = new THREE.Group();
    g.add(box(2.2, 2.6, 2.0, 0x3b2a1c, 0, 1.4, 0));
    g.add(box(1.2, 1.0, 1.0, 0x55402a, 0, 2.8, 0));
    g.add(box(0.3, 1.6, 0.3, 0x2a1d12, 1.4, 1.6, 0));
    g.add(box(0.3, 1.6, 0.3, 0x2a1d12, -1.4, 1.6, 0));
    return g;
  },
};

export function buildMesh(kind) {
  const model = getModel(kind); // .glb carregado, se houver
  if (model) {
    model.userData.kind = kind;
    return model;
  }
  const voxel = buildVoxelModel(kind); // modelo voxel data-driven
  if (voxel) {
    voxel.userData.kind = kind;
    return voxel;
  }
  const fn = builders[kind] ?? builders.rotboar; // fallback legado
  const g = fn();
  g.userData.kind = kind;
  return g;
}

/**
 * Pequena esfera/cristal usada para projéteis e loot. Geometria (por raio) e
 * material (por cor) são COMPARTILHADOS via cache — projéteis nascem/morrem em
 * alta frequência e não precisam de recursos próprios. O mesh é marcado com
 * `userData.shared` para o cleanup NÃO dar dispose (quebraria os demais).
 * Ver docs/profiling-projectiles.md e ADR 0026.
 */
const _orbGeo = new Map();
const _orbMat = new Map();

function orbGeometry(radius) {
  const key = Math.round(radius * 100);
  let g = _orbGeo.get(key);
  if (!g) { g = new THREE.IcosahedronGeometry(radius, 0); _orbGeo.set(key, g); }
  return g;
}
function orbMaterial(color) {
  let m = _orbMat.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.4 });
    _orbMat.set(color, m);
  }
  return m;
}

export function buildOrb(color = 0x88e0ff, radius = 0.22) {
  const m = new THREE.Mesh(orbGeometry(radius), orbMaterial(color));
  m.castShadow = true;
  m.userData.shared = true; // recursos compartilhados: não descartar no cleanup
  return m;
}

