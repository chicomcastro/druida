import * as THREE from 'three';
import { C, Factions } from '../core/ecs/components.js';
import { BALANCE } from '../data/balance.js';
import { ENEMIES, BOSSES, ELITE_AFFIXES } from '../data/enemies.js';
import { createEnemy } from '../entities/factories.js';
import { applyDamage, healEntity } from './combat.js';
import { weightedPick } from '../utils/math.js';

/**
 * Spawn e escala de inimigos (extraído de `Game` — ADR 0033). Funções puras
 * sobre `game`; `Game` mantém métodos finos que delegam para cá, preservando a
 * API usada pelos sistemas/managers (`game.spawnEnemyByKey`, etc.).
 * Packs compostos e elites com afixo: ver ADR 0045.
 */

/** Escala HP/dano do inimigo pelo nível do grupo e número de jogadores. */
export function scaleEnemy(game, def) {
  const lvl = game.progress.level;
  const players = Math.max(1, [...game.world.query(C.PlayerControlled)].length);
  const e = BALANCE.enemy;
  const hpMul = (1 + (lvl - 1) * e.hpPerLevel) * (e.hpPlayerBase + players * e.hpPerPlayer);
  const dmgMul = 1 + (lvl - 1) * e.damagePerLevel;
  return { ...def, hp: Math.round(def.hp * hpMul), damage: Math.round(def.damage * dmgMul) };
}

export function spawnEnemyByKey(game, key, x, z) {
  const def = ENEMIES[key] ?? BOSSES[key];
  if (!def) return;
  const scaled = scaleEnemy(game, def);
  const id = createEnemy(game.world, game.renderer, scaled, { x, z });
  game.world.get(id, C.LootTable).xp = scaled.xp;
  return id;
}

/**
 * Promove um inimigo vivo a ELITE: um afixo que muda o combate (veloz,
 * pétreo, volátil, sanguessuga), corpo maior, gema flutuante na cor do afixo
 * e recompensa maior (xp/drop/essência). Ver ADR 0045.
 */
export function promoteToElite(game, id, affixKey) {
  const affix = ELITE_AFFIXES[affixKey];
  const ai = game.world.get(id, C.AI);
  if (!affix || !ai) return false;
  ai.elite = affixKey;

  const hp = game.world.get(id, C.Health);
  hp.max = Math.round(hp.max * (affix.mods?.hp ?? 1.4));
  hp.hp = hp.max;
  const vel = game.world.get(id, C.Velocity);
  if (vel && affix.mods?.speed) vel.speed *= affix.mods.speed;

  const loot = game.world.get(id, C.LootTable);
  if (loot) {
    loot.xp = Math.round((loot.xp ?? 5) * 2.5);
    loot.dropChance = Math.max(loot.dropChance ?? 0.3, 0.8);
    loot.essenceBonus = (loot.essenceBonus ?? 0) + 8;
  }

  // Presença: corpo maior + gema do afixo flutuando sobre a cabeça.
  const r = game.world.get(id, C.Renderable);
  if (r?.object3d) {
    const s = (r.baseScale ?? 1) * 1.25;
    r.baseScale = s;
    r.object3d.scale.setScalar(s);
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({ color: affix.color, emissive: affix.color, emissiveIntensity: 0.9 }),
    );
    gem.position.y = 2.3;
    r.object3d.add(gem);
  }
  return true;
}

/**
 * Spawna um pack composto (composição autoral do bioma) em círculo ao redor
 * do ponto. Retorna os ids criados.
 */
export function spawnPack(game, comp: string[], x, z) {
  const ids = [];
  for (let i = 0; i < comp.length; i++) {
    const a = (i / comp.length) * Math.PI * 2;
    const id = spawnEnemyByKey(game, comp[i], x + Math.sin(a) * 1.6, z + Math.cos(a) * 1.6);
    if (id) ids.push(id);
  }
  return ids;
}

/** Sorteia um pack do bioma (ou null se o bioma não define packs). */
export function pickPack(biomeDef, rng = Math.random) {
  if (!biomeDef?.packs?.length) return null;
  return weightedPick(biomeDef.packs, rng);
}

/**
 * Efeitos de afixo que dependem de eventos (registrado uma vez pelo Game):
 * Volátil explode ao morrer (dano em jogadores próximos); Sanguessuga se cura
 * pela metade do dano que causa.
 */
export function registerEliteEffects(game) {
  game.on('kill', (e) => {
    const ai = game.world.get(e.id, C.AI);
    const affix = ai?.elite ? ELITE_AFFIXES[ai.elite] : null;
    if (!affix?.explode) return;
    const { damage, radius } = affix.explode;
    game.emit('vfxRing', { x: e.x, z: e.z, radius, color: 0xff8a3a });
    game.camera?.addShake(0.35);
    for (const [pid, tr, pc, hp] of game.world.query(C.Transform, C.PlayerControlled, C.Health)) {
      if (pc.downed || hp.dead) continue;
      if (Math.hypot(tr.x - e.x, tr.z - e.z) <= radius) {
        applyDamage(game, pid, damage, { fromX: e.x, fromZ: e.z, knockback: 6 });
      }
    }
  });
  game.on('damage', (e) => {
    if (!e.attackerId) return;
    const ai = game.world.get(e.attackerId, C.AI);
    const affix = ai?.elite ? ELITE_AFFIXES[ai.elite] : null;
    const fac = game.world.get(e.id, C.Faction);
    if (affix?.leech && fac?.team === Factions.PLAYER) {
      healEntity(game, e.attackerId, e.amount * affix.leech);
    }
  });
}

export function spawnBossFight(game, x, z) {
  const id = spawnEnemyByKey(game, 'rotlord', x, z);
  const boss = game.world.get(id, C.Boss);
  if (boss) boss.name = BOSSES.rotlord.name;
  game.emit('objective', { text: `${BOSSES.rotlord.name} ergue-se da podridão!` });
  return id;
}

export function spawnMiniBoss(game, x, z) {
  const def = {
    name: 'Árvore-Carniça', mesh: 'husk', behavior: 'melee', boss: true,
    hp: 420, speed: 1.6, damage: 16, radius: 1.3, scale: 1.8,
    aggroRange: 30, attackRange: 2.6, attackCooldown: 1.8, xp: 120,
    loot: { dropChance: 1 },
  };
  const scaled = scaleEnemy(game, def);
  const id = createEnemy(game.world, game.renderer, scaled, { x, z });
  game.world.get(id, C.LootTable).xp = scaled.xp;
  const boss = game.world.get(id, C.Boss);
  if (boss) { boss.name = def.name; boss.miniBoss = true; }
  return id;
}
