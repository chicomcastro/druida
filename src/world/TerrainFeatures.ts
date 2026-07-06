import * as THREE from 'three';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { biomeAt } from './WorldManager.js';
import { pixelTexture } from '../core/render/pixelTextures.js';
import { makeRng } from '../utils/math.js';

/**
 * Elevação decorativa (ADR 0064, M14.3; organicizada no ADR 0109): afloramentos
 * de falésia ao longo das fronteiras **orgânicas** de bioma — pilhas de blocos
 * de pedra que marcam a transição como no MCD, com vãos largos para passagem (a
 * navegação continua plana). As bordas são detectadas amostrando `biomeAt` numa
 * grade: onde um bioma encosta no outro, nasce um afloramento. Estático
 * (determinístico pela seed) e instanciado: 1 draw call. Collider por aglomerado.
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

    // Fronteiras ORGÂNICAS: amostra biomeAt numa grade e marca as células cuja
    // borda (direita/baixo) troca de bioma. Espaçamento por célula grande dá os
    // vãos largos de passagem; nem toda borda vira falésia (rng).
    const STEP = 12, EXTENT = 240;
    for (let gx = -EXTENT; gx <= EXTENT; gx += STEP) {
      for (let gz = -EXTENT; gz <= EXTENT; gz += STEP) {
        const here = biomeAt(gx, gz);
        const border = here !== biomeAt(gx + STEP, gz) || here !== biomeAt(gx, gz + STEP);
        if (!border) continue;
        if (rng() < 0.5) continue; // quebra o ritmo: vãos largos
        const cx = gx + (rng() - 0.5) * 3;
        const cz = gz + (rng() - 0.5) * 3;
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
