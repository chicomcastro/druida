import * as THREE from 'three';
import { getModel } from './modelLoader.js';
import { buildVoxelModel } from './voxelModels.js';

/**
 * Meshes dos personagens/inimigos. Prioridade: (1) modelo .glb carregado, se
 * registrado (ADR 0036); (2) modelo voxel data-driven (estilo MC Dungeons, com
 * partes nomeadas para animação — ver voxelModels.ts). Kind desconhecido cai
 * num voxel padrão. O RenderSyncSystem só liga Transform -> object3d.
 */
export function buildMesh(kind) {
  const model = getModel(kind); // .glb carregado, se houver
  if (model) {
    model.userData.kind = kind;
    return model;
  }
  const voxel = buildVoxelModel(kind) ?? buildVoxelModel('rotboar'); // data-driven (com fallback)
  voxel.userData.kind = kind;
  return voxel;
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
  if (!g) { g = new THREE.BoxGeometry(radius * 1.5, radius * 1.5, radius * 1.5); _orbGeo.set(key, g); } // cubo: drop/projétil MC (ADR 0078)
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

