import * as THREE from 'three';
import { C, Factions, Transform, Velocity, Health, Sap, Collider, Faction, Intent, StatusEffects, Cooldowns } from '../core/ecs/components.js';
import { buildMesh, buildOrb } from './meshes.js';
import { BALANCE } from '../data/balance.js';

const PLAYER_COLORS = [0xffe08a, 0x8ad0ff, 0xff9a8a, 0xb6ff8a];

export function createPlayer(world, renderer, { index = 0, x = 0, z = 0 } = {}) {
  const id = world.createEntity();
  // Container: corpo (trocável por forma) + anel de identidade.
  const container = new THREE.Group();
  const body = buildMesh('druid');
  container.add(body);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.7, 24),
    new THREE.MeshBasicMaterial({ color: PLAYER_COLORS[index % 4], transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  container.add(ring);
  renderer.add(container);

  world.add(id, C.Transform, Transform(x, z));
  world.add(id, C.Velocity, Velocity(0, 0, 6));
  world.add(id, C.Renderable, { object3d: container, body, ring, kind: 'druid', baseScale: 1 });
  world.add(id, C.Health, Health(BALANCE.player.baseHp));
  world.add(id, C.Sap, Sap(BALANCE.player.sapMax));
  world.add(id, C.Collider, Collider(0.5));
  world.add(id, C.Faction, Faction(Factions.PLAYER));
  world.add(id, C.Intent, Intent());
  world.add(id, C.StatusEffects, StatusEffects());
  world.add(id, C.Cooldowns, Cooldowns());
  world.add(id, C.PlayerControlled, {
    index,
    color: PLAYER_COLORS[index % 4],
    downed: false,
    downedTimer: 0,
    reviveProgress: 0,
    dodgeTimer: 0,
    attackTimer: 0,
    facing: 0,
  });
  world.add(id, C.Form, { current: 'humanoid', list: ['humanoid'], swapFlash: 0 });
  world.add(id, C.Loadout, {
    weapon: null,
    armor: null,
    artifacts: [null, null, null],
    enchantPoints: 0,
  });
  world.add(id, C.Equipment, { weapon: null, armor: null, artifacts: [null, null, null] });
  world.add(id, C.Inventory, { items: [], essence: 0 });
  return id;
}

export function createEnemy(world, renderer, def, { x = 0, z = 0 } = {}) {
  const id = world.createEntity();
  const mesh = buildMesh(def.mesh ?? 'rotboar');
  renderer.add(mesh);

  world.add(id, C.Transform, Transform(x, z));
  world.add(id, C.Velocity, Velocity(0, 0, def.speed ?? 3));
  world.add(id, C.Renderable, { object3d: mesh, baseScale: def.scale ?? 1 });
  if (def.scale) mesh.scale.setScalar(def.scale);
  world.add(id, C.Health, Health(def.hp ?? 30));
  world.add(id, C.Collider, Collider(def.radius ?? 0.5));
  world.add(id, C.Faction, Faction(Factions.ENEMY));
  world.add(id, C.StatusEffects, StatusEffects());
  world.add(id, C.Cooldowns, Cooldowns());
  world.add(id, C.AI, {
    behavior: def.behavior ?? 'melee',
    state: 'idle',
    aggroRange: def.aggroRange ?? 16,
    attackRange: def.attackRange ?? 1.4,
    attackCooldown: def.attackCooldown ?? 1.4,
    timer: 0,
    damage: def.damage ?? 8,
    targetId: 0,
    projectileColor: def.projectileColor ?? 0xb06bd0,
    summon: def.summon ?? null,
  });
  world.add(id, C.LootTable, def.loot ?? { essence: [1, 3], xp: def.xp ?? 5, drops: [] });
  if (def.boss) world.add(id, C.Boss, { name: def.name, phase: 1, def });
  world.add(id, C.Tint, { defaultColor: null, flash: 0 });
  return id;
}

/** Projétil simples (usado por magias e por inimigos ranged). */
export function createProjectile(world, renderer, { x, z, dirX, dirZ, speed, damage, team, color, range = 14, radius = 0.25, effect = null, pierce = 0 }) {
  const id = world.createEntity();
  const mesh = buildOrb(color, radius);
  mesh.position.set(x, 0.8, z);
  renderer.add(mesh);
  world.add(id, C.Transform, Transform(x, z));
  world.add(id, C.Velocity, { vx: dirX * speed, vz: dirZ * speed, speed });
  world.add(id, C.Renderable, { object3d: mesh, baseScale: 1, yOffset: 0.8 });
  world.add(id, C.Faction, Faction(team));
  world.add(id, C.Hitbox, { damage, team, radius: radius + 0.3, effect, pierce, hit: new Set() });
  world.add(id, C.Lifetime, { remaining: range / speed });
  return id;
}

export function createLootOrb(world, renderer, { x, z, item }) {
  const id = world.createEntity();
  const color = item.rarityColor ?? 0xffe08a;
  const mesh = buildOrb(color, 0.3);
  mesh.position.set(x, 0.6, z);
  renderer.add(mesh);
  world.add(id, C.Transform, Transform(x, z));
  world.add(id, C.Renderable, { object3d: mesh, baseScale: 1, yOffset: 0.6, bob: true });
  world.add(id, C.Pickup, { item, magnet: 2.2 });
  return id;
}
