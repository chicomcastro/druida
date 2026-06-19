import { C, Factions, Transform, Velocity, Health, Collider, Faction, StatusEffects } from '../../core/ecs/components.js';
import { createProjectile } from '../../entities/factories.js';
import { buildMesh } from '../../entities/meshes.js';
import { applyDamage, meleeArc } from '../combat.js';

/**
 * Registro de habilidades data-driven. Cada habilidade tem custo de Seiva,
 * cooldown e uma função `execute`. Ataques básicos de forma têm custo 0.
 * Ver docs/adr/0005-ability-system.md.
 */

function aoeDamage(game, x, z, radius, damage, team, opts = {}) {
  const { world } = game;
  const r2 = radius * radius;
  for (const [id, tr, fac, hp] of world.query(C.Transform, C.Faction, C.Health)) {
    if (fac.team === team || hp.dead) continue;
    const dx = tr.x - x, dz = tr.z - z;
    if (dx * dx + dz * dz <= r2) {
      applyDamage(game, id, damage, { ...opts, fromX: x, fromZ: z });
    }
  }
}

function spawnSummon(game, ownerId, { x, z, kind, hp, damage, ttl }) {
  const { world, renderer } = game;
  const id = world.createEntity();
  const mesh = buildMesh(kind);
  mesh.scale.setScalar(0.8);
  renderer.add(mesh);
  world.add(id, C.Transform, Transform(x, z));
  world.add(id, C.Velocity, Velocity(0, 0, 5.5));
  world.add(id, C.Renderable, { object3d: mesh, baseScale: 0.8 });
  world.add(id, C.Health, Health(hp));
  world.add(id, C.Collider, Collider(0.4));
  world.add(id, C.Faction, Faction(Factions.PLAYER));
  world.add(id, C.StatusEffects, StatusEffects());
  world.add(id, C.AI, {
    behavior: 'ally_melee', state: 'idle', aggroRange: 18, attackRange: 1.3,
    attackCooldown: 1.0, timer: 0, damage, targetId: 0,
  });
  world.add(id, C.Summon, { ownerId, ttl });
  world.add(id, C.Tint, { defaultColor: null, flash: 0 });
  return id;
}

const dir = (a) => ({ x: Math.sin(a), z: Math.cos(a) });

export const ABILITIES = {
  // --- Ataques básicos de forma -------------------------------------------
  staff_strike: {
    name: 'Golpe', sap: 0, cooldown: 0,
    execute(game, id, angle) {
      // Ataque-base do humanoide: melee por padrão (foco do jogo); apenas armas
      // de conjuração (style === 'ranged', mais raras) disparam projétil. O
      // elemento da arma aplica o status correspondente no acerto. Ver ADR 0035.
      const eq = game.world.get(id, C.Equipment);
      const w = eq?.weapon;
      const el = w?.element ?? 'nature';
      const dmg = (w?.damage ?? 9) * game.dmgMul(id);
      const effect = { fire: { burn: 2.5 }, ice: { freeze: 1.2 }, nature: { root: 0.6 }, storm: { stun: 0.4 } }[el];
      if (w?.style === 'ranged') {
        const color = { nature: 0x8fe06a, fire: 0xff7a3a, ice: 0x8ad0ff, storm: 0xc9a8ff }[el] ?? 0x8fe06a;
        const d = dir(angle);
        createProjectile(game.world, game.renderer, {
          x: game.x(id), z: game.z(id), dirX: d.x, dirZ: d.z, speed: 16,
          damage: dmg, team: Factions.PLAYER, color, range: 13, effect,
        });
      } else {
        meleeArc(game, id, {
          angle, range: w?.range ?? 2.0, arc: w?.arc ?? 0.8,
          damage: dmg, team: Factions.PLAYER, knockback: 3, effect,
        });
      }
    },
  },
  wolf_bite: {
    name: 'Mordida', sap: 0, cooldown: 0,
    execute(game, id, angle) {
      meleeArc(game, id, { angle, range: 1.8, arc: 0.9, damage: 11 * game.dmgMul(id), team: Factions.PLAYER, knockback: 3 });
      game.gainSap(id, 6);
    },
  },
  bear_swipe: {
    name: 'Patada', sap: 0, cooldown: 0,
    execute(game, id, angle) {
      meleeArc(game, id, { angle, range: 2.3, arc: 1.4, damage: 20 * game.dmgMul(id), team: Factions.PLAYER, knockback: 7, effect: { stun: 0.5 } });
      game.gainSap(id, 5);
    },
  },
  raven_peck: {
    name: 'Bicada', sap: 0, cooldown: 0,
    execute(game, id, angle) {
      const d = dir(angle);
      createProjectile(game.world, game.renderer, { x: game.x(id), z: game.z(id), dirX: d.x, dirZ: d.z, speed: 20, damage: 8 * game.dmgMul(id), team: Factions.PLAYER, color: 0x6f6f88, range: 9 });
      game.gainSap(id, 4);
    },
  },
  frog_tongue: {
    name: 'Língua', sap: 0, cooldown: 0,
    execute(game, id, angle) {
      meleeArc(game, id, { angle, range: 3.2, arc: 0.35, damage: 9 * game.dmgMul(id), team: Factions.PLAYER, effect: { poison: 3 }, knockback: -4 });
      game.gainSap(id, 5);
    },
  },

  // --- Artefatos / magias (cooldown) --------------------------------------
  root_spikes: {
    name: 'Espinhos de Raiz', sap: 18, cooldown: 5,
    execute(game, id) {
      aoeDamage(game, game.x(id), game.z(id), 4.5, 16 * game.dmgMul(id), Factions.PLAYER, { effect: { root: 2.5 }, attackerId: id });
      game.emit('vfxRing', { x: game.x(id), z: game.z(id), radius: 4.5, color: 0x6fae4f });
    },
  },
  wildfire: {
    name: 'Chama Selvagem', sap: 14, cooldown: 3,
    execute(game, id, angle) {
      const d = dir(angle);
      createProjectile(game.world, game.renderer, { x: game.x(id), z: game.z(id), dirX: d.x, dirZ: d.z, speed: 13, damage: 14 * game.dmgMul(id), team: Factions.PLAYER, color: 0xff7a3a, range: 11, effect: { burn: 4 }, radius: 0.35 });
    },
  },
  ice_lance: {
    name: 'Lança de Gelo', sap: 16, cooldown: 4,
    execute(game, id, angle) {
      const d = dir(angle);
      createProjectile(game.world, game.renderer, { x: game.x(id), z: game.z(id), dirX: d.x, dirZ: d.z, speed: 22, damage: 18 * game.dmgMul(id), team: Factions.PLAYER, color: 0x8ad0ff, range: 16, effect: { freeze: 2 }, pierce: 3 });
    },
  },
  healing_totem: {
    name: 'Totem Curativo', sap: 25, cooldown: 12,
    execute(game, id) {
      const tid = game.world.createEntity();
      const mesh = buildMesh('shaman');
      mesh.scale.setScalar(0.6);
      game.renderer.add(mesh);
      game.world.add(tid, C.Transform, Transform(game.x(id), game.z(id)));
      game.world.add(tid, C.Renderable, { object3d: mesh, baseScale: 0.6 });
      game.world.add(tid, C.Summon, { ownerId: id, ttl: 10, healAura: { radius: 5, perSec: 9 } });
      game.world.add(tid, C.Faction, Faction(Factions.PLAYER));
      game.emit('vfxRing', { x: game.x(id), z: game.z(id), radius: 5, color: 0x7fe0a0 });
    },
  },
  pack_howl: {
    name: 'Chamado da Matilha', sap: 30, cooldown: 16,
    execute(game, id) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        spawnSummon(game, id, { x: game.x(id) + Math.sin(a) * 1.5, z: game.z(id) + Math.cos(a) * 1.5, kind: 'wolf', hp: 40, damage: 10, ttl: 18 });
      }
    },
  },
  thorn_burst: {
    name: 'Explosão de Espinhos', sap: 20, cooldown: 6,
    execute(game, id) {
      aoeDamage(game, game.x(id), game.z(id), 3.5, 22 * game.dmgMul(id), Factions.PLAYER, { knockback: 9, fromX: game.x(id), fromZ: game.z(id), attackerId: id });
      game.emit('vfxRing', { x: game.x(id), z: game.z(id), radius: 3.5, color: 0xa0e060 });
    },
  },
  gust: {
    name: 'Rajada', sap: 12, cooldown: 4,
    execute(game, id, angle) {
      meleeArc(game, id, { angle, range: 5, arc: 0.7, damage: 6 * game.dmgMul(id), team: Factions.PLAYER, knockback: 12 });
      game.emit('vfxCone', { x: game.x(id), z: game.z(id), angle, color: 0xd8f0ff });
    },
  },
  meteor_sap: {
    name: 'Meteoro de Seiva', sap: 35, cooldown: 14,
    execute(game, id, angle) {
      const d = dir(angle);
      const tx = game.x(id) + d.x * 7, tz = game.z(id) + d.z * 7;
      game.schedule(0.7, () => {
        aoeDamage(game, tx, tz, 3.8, 40 * game.dmgMul(id), Factions.PLAYER, { effect: { burn: 3 }, attackerId: id });
        game.emit('vfxRing', { x: tx, z: tz, radius: 3.8, color: 0x9fe06a });
      });
      game.emit('vfxMarker', { x: tx, z: tz, radius: 3.8, delay: 0.7 });
    },
  },
};

/** Tenta lançar uma habilidade respeitando Seiva e cooldown. */
export function castAbility(game, id, abilityId, angle, opts = {}) {
  const ab = ABILITIES[abilityId];
  if (!ab) return false;
  const cds = game.world.get(id, C.Cooldowns);
  if (cds && (cds.map[abilityId] ?? 0) > 0) return false;
  if (ab.sap > 0 && !game.spendSap(id, ab.sap)) return false;
  ab.execute(game, id, angle, opts);
  if (cds && ab.cooldown > 0) cds.map[abilityId] = ab.cooldown;
  game.emit('cast', { id, abilityId });
  return true;
}
