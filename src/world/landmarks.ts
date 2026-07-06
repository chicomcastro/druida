import * as THREE from 'three';
import { tiledPixelTexture } from '../core/render/pixelTextures.js';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { LANDMARKS } from '../gameplay/story.js';
import { buildVoxelModel } from '../entities/voxelModels.js';

/**
 * Cria os marcos interativos da campanha: a Guardiã (NPC do hub) e os três
 * santuários de Forma Ancestral, distribuídos pelos biomas no eixo -Z.
 * A Guardiã e o mercador usam os modelos voxel de NPC (ADR 0043), no mesmo
 * estilo dos personagens/inimigos e com animação procedural de idle.
 */
const FORM_GLOW = { wolf: 0x8fd0ff, bear: 0xff9a5a, raven: 0x9a7aff, frog: 0x6affb0 };

export function buildLandmarks(game) {
  buildNpc(game, LANDMARKS.npc);
  buildSanctuary(game, LANDMARKS.sanctuary_wolf, 'wolf');
  buildSanctuary(game, LANDMARKS.sanctuary_bear, 'bear');
  buildSanctuary(game, LANDMARKS.sanctuary_raven, 'raven');
  buildSanctuary(game, LANDMARKS.sanctuary_frog, 'frog');
  buildMerchant(game, { x: 0, z: 15 });  // banca no vão norte da praça (ADR 0111)
  buildChest(game, { x: 4, z: 15 });
}

/**
 * Banca de mercador em escala MCD (ADR 0075): estrutura inteira com postes
 * altos, toldo listrado, balcão e caixotes — não uma mesinha. Base na origem;
 * o NPC fica no centro e o balcão em +Z (lado do jogador).
 */
export function buildMerchantStall(canopyColor = 0xd8862a) {
  const g = new THREE.Group();
  const box = (w, h, d, x, y, z, color, tex?, trx = 1, try_ = 1, extra: any = {}) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, map: tex ? tiledPixelTexture(tex, trx, try_) : null, ...extra }),
    );
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    return m;
  };
  // Postes de canto (altura MCD: ~2× o herói) com pegada 4×3: a face
  // externa de cada poste cai na linha do grid do chão (ADR 0079).
  for (const [px, pz] of [[-1.89, -1.39], [1.89, -1.39], [-1.89, 1.39], [1.89, 1.39]]) {
    box(0.22, 3.0, 0.22, px, 1.5, pz, 0x4a3626, 'log', 1, 3);
  }
  // Toldo: laje larga + listra central mais clara (leitura de tenda de feira).
  box(4.6, 0.28, 3.6, 0, 3.1, 0, canopyColor, 'cloth', 4, 3);
  const c = new THREE.Color(canopyColor).multiplyScalar(1.35);
  box(4.62, 0.16, 1.2, 0, 3.32, 0, c.getHex(), 'cloth', 4, 1);
  // Balcão de vendas no lado do jogador (+Z) com mercadorias texturizadas.
  box(3.6, 0.95, 1.15, 0, 0.48, 1.35, 0x7a4a2a, 'planks', 4, 1);
  box(0.55, 0.32, 0.45, -1.1, 1.12, 1.3, 0x9fe06a, 'cloth');
  box(0.4, 0.26, 0.4, 0.15, 1.09, 1.45, 0xd8b04a, 'cloth');
  box(0.5, 0.38, 0.4, 1.15, 1.15, 1.25, 0xb85a3a, 'cloth');
  // Caixotes empilhados nas laterais.
  box(0.85, 0.85, 0.85, -2.55, 0.43, 0.9, 0x8a5a2a, 'planks', 1, 1);
  box(0.7, 0.7, 0.7, -2.5, 1.2, 0.85, 0x9a6a3a, 'planks', 1, 1);
  box(0.85, 0.85, 0.85, 2.55, 0.43, 0.6, 0x8a5a2a, 'planks', 1, 1);
  return g;
}

/** Centro alinhado p/ arestas no grid (ADR 0079): pegada par ⇒ meio-inteiro. */
const alignTo = (v, size) => (Math.round(size) % 2 === 1 ? Math.round(v) : Math.round(v - 0.5) + 0.5);

function buildMerchant(game, pos) {
  const sx = alignTo(pos.x, 4), sz = alignTo(pos.z, 3); // pegada 4×3 da banca
  const g = buildVoxelModel('merchant');
  g.position.set(sx, 0, sz);
  game.renderer.add(g);
  // Banca-estrutura (mesh próprio: não balança com o idle do NPC).
  const stall = buildMerchantStall();
  stall.position.set(sx, 0, sz);
  game.renderer.add(stall);
  const id = game.world.createEntity();
  game.world.add(id, C.Transform, Transform(sx, sz));
  game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
  game.world.add(id, C.Collider, Collider(0.6, true));
  game.world.add(id, C.Interactable, { kind: 'merchant', prompt: 'E — Mercador', range: 3.5, used: false });
}

function buildChest(game, pos) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0x8a5a2a, map: tiledPixelTexture('planks', 1, 1) }));
  box.position.y = 0.45; box.castShadow = true;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.2, 0.75), new THREE.MeshStandardMaterial({ color: 0xc8a23a }));
  lid.position.y = 0.85;
  g.add(box); g.add(lid);
  g.position.set(pos.x, 0, pos.z);
  game.renderer.add(g);
  const id = game.world.createEntity();
  game.world.add(id, C.Transform, Transform(pos.x, pos.z));
  game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
  game.world.add(id, C.Collider, Collider(0.6, true));
  game.world.add(id, C.Interactable, { kind: 'chest', prompt: 'E — Baú compartilhado', range: 3, used: false });
}

function buildNpc(game, pos) {
  const g = buildVoxelModel('guardian');
  g.position.set(pos.x, 0, pos.z);
  game.renderer.add(g);

  const id = game.world.createEntity();
  game.world.add(id, C.Transform, Transform(pos.x, pos.z));
  game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
  game.world.add(id, C.Collider, Collider(0.6, true));
  game.world.add(id, C.Interactable, { kind: 'npc', prompt: 'E — Falar com a Guardiã', range: 3, used: false });
}

function buildSanctuary(game, pos, form) {
  const color = FORM_GLOW[form] ?? 0x9fe06a;
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x4a4a55, map: tiledPixelTexture('stone', 3, 1) }));
  base.position.y = 0.25; base.receiveShadow = true;
  const stone = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x3a3a45, map: tiledPixelTexture('stone', 1, 3) }));
  stone.position.y = 1.5; stone.castShadow = true;
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }),
  );
  crystal.position.y = 3.1;
  g.add(base); g.add(stone); g.add(crystal);
  g.position.set(alignTo(pos.x, 3), 0, alignTo(pos.z, 3));
  game.renderer.add(g);
  // animação leve do cristal
  game._sanctCrystals = game._sanctCrystals ?? [];
  game._sanctCrystals.push(crystal);

  const id = game.world.createEntity();
  game.world.add(id, C.Transform, Transform(pos.x, pos.z));
  game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
  game.world.add(id, C.Collider, Collider(1.6, true));
  game.world.add(id, C.Interactable, {
    kind: 'sanctuary', form, prompt: `E — Despertar Santuário`, range: 3.5, used: false,
  });
}
