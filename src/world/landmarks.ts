import * as THREE from 'three';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { LANDMARKS } from '../gameplay/story.js';

/**
 * Cria os marcos interativos da campanha: a Guardiã (NPC do hub) e os três
 * santuários de Forma Ancestral, distribuídos pelos biomas no eixo -Z.
 */
const FORM_GLOW = { bear: 0xff9a5a, raven: 0x9a7aff, frog: 0x6affb0 };

export function buildLandmarks(game) {
  buildNpc(game, LANDMARKS.npc);
  buildSanctuary(game, LANDMARKS.sanctuary_bear, 'bear');
  buildSanctuary(game, LANDMARKS.sanctuary_raven, 'raven');
  buildSanctuary(game, LANDMARKS.sanctuary_frog, 'frog');
}

function buildNpc(game, pos) {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0x6fae8f }));
  robe.position.y = 0.8; robe.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xe8d0a8 }));
  head.position.y = 1.7;
  g.add(robe); g.add(head);
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
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x4a4a55 }));
  base.position.y = 0.25; base.receiveShadow = true;
  const stone = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x3a3a45 }));
  stone.position.y = 1.5; stone.castShadow = true;
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }),
  );
  crystal.position.y = 3.1;
  g.add(base); g.add(stone); g.add(crystal);
  g.position.set(pos.x, 0, pos.z);
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
