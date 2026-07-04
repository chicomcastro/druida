import * as THREE from 'three';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { RING_RADII } from './WorldManager.js';
import { pixelTexture } from '../core/render/pixelTextures.js';
import { makeRng } from '../utils/math.js';

/**
 * Elevação decorativa (ADR 0064, M14.3): afloramentos de falésia ao longo
 * das fronteiras de bioma — pilhas de blocos de pedra que marcam a transição
 * como no MCD, com vãos largos para passagem (a navegação continua plana).
 * Estático (colocado uma vez, determinístico pela seed) e instanciado:
 * 1 draw call para todas as falésias. Cada aglomerado ganha um collider.
 */
export class TerrainFeatures {
  game: any;
  inst: THREE.InstancedMesh | null;

  constructor(game) {
    this.game = game;
    this.inst = null;
    const rng = makeRng(((game.seed ?? 1337) ^ 0x7e77a1) >>> 0);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const mats: { m: THREE.Matrix4; c: number }[] = [];

    // Fronteiras internas dos anéis (a última é o "fim do mundo" — sem borda).
    const rings = RING_RADII.slice(0, -1).map((r) => r.max);
    for (const R of rings) {
      const circ = 2 * Math.PI * R;
      const clusters = Math.floor(circ / 16); // um aglomerado a cada ~16u (vãos largos)
      for (let i = 0; i < clusters; i++) {
        if (rng() < 0.35) continue; // quebra o ritmo: nem toda vaga tem falésia
        const a = (i / clusters) * Math.PI * 2 + rng() * 0.15;
        const cx = Math.sin(a) * (R + (rng() - 0.5) * 2);
        const cz = Math.cos(a) * (R + (rng() - 0.5) * 2);
        if (game.settlements?.isSafe?.(cx, cz, 10)) continue; // longe das vilas
        if (Math.hypot(cx, cz) < 24) continue; // nunca no hub
        // Aglomerado: 2–5 blocos encostados, 1–2 de altura, levemente girados.
        const blocks = 2 + Math.floor(rng() * 4);
        for (let b = 0; b < blocks; b++) {
          const bx = cx + (rng() - 0.5) * 2.2;
          const bz = cz + (rng() - 0.5) * 2.2;
          const h = rng() < 0.4 ? 2 : 1;
          for (let y = 0; y < h; y++) {
            const s = 1 + rng() * 0.25;
            dummy.position.set(bx, 0.5 + y * 0.95, bz);
            dummy.rotation.y = (Math.floor(rng() * 4) * Math.PI) / 2;
            dummy.scale.set(s, 1, s);
            dummy.updateMatrix();
            mats.push({ m: dummy.matrix.clone(), c: 0x9a958e * 1 });
          }
        }
        // Um collider por aglomerado (raio cobre a pilha).
        const id = game.world.createEntity();
        game.world.add(id, C.Transform, Transform(cx, cz));
        game.world.add(id, C.Collider, Collider(1.5, true));
      }
    }

    if (!mats.length) return;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 1, map: pixelTexture('stone') });
    this.inst = new THREE.InstancedMesh(geo, mat, mats.length);
    this.inst.castShadow = true;
    this.inst.receiveShadow = true;
    this.inst.frustumCulled = false;
    for (let i = 0; i < mats.length; i++) {
      this.inst.setMatrixAt(i, mats[i].m);
      // Tom de pedra com leve variação por bloco.
      color.setHex(0x9a958e).multiplyScalar(0.9 + ((i * 37) % 10) * 0.02);
      this.inst.setColorAt(i, color);
    }
    game.renderer?.add(this.inst);
  }
}
