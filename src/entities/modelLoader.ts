import * as THREE from 'three';
import { MODELS, modelUrl } from './modelRegistry.js';

/**
 * Carregamento de modelos .glb com cache e fallback. O `GLTFLoader` é importado
 * dinamicamente e **apenas** quando há modelos registrados — assim o bundle
 * permanece enxuto enquanto o jogo roda com voxels procedurais. Ver ADR 0036.
 */
const _cache = new Map<string, THREE.Object3D>();
let _loaded = false;

/** Pré-carrega os modelos registrados. No-op (e sem importar GLTFLoader) se vazio. */
export async function preloadModels(): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const kinds = Object.keys(MODELS);
  if (kinds.length === 0) return; // sem assets: mantém o bundle sem o GLTFLoader

  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  await Promise.all(
    kinds.map(async (kind) => {
      const def = MODELS[kind];
      try {
        const gltf = await loader.loadAsync(modelUrl(def.file));
        const root: THREE.Object3D = gltf.scene;
        if (def.scale) root.scale.setScalar(def.scale);
        if (def.yOffset) root.position.y += def.yOffset;
        root.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        _cache.set(kind, root);
      } catch (err) {
        console.warn(`[models] falha ao carregar "${kind}" (${def.file}); usando voxel procedural.`, err);
      }
    }),
  );
}

/** Retorna um clone do modelo carregado para o `kind`, ou `null` (→ procedural). */
export function getModel(kind: string): THREE.Object3D | null {
  const base = _cache.get(kind);
  return base ? base.clone(true) : null;
}

// --- Apoio a testes ------------------------------------------------------
export function _setModelForTest(kind: string, obj: THREE.Object3D): void {
  _cache.set(kind, obj);
}
export function _resetModels(): void {
  _cache.clear();
  _loaded = false;
}
