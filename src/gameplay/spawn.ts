import { C } from '../core/ecs/components.js';
import { BALANCE } from '../data/balance.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { createEnemy } from '../entities/factories.js';

/**
 * Spawn e escala de inimigos (extraído de `Game` — ADR 0033). Funções puras
 * sobre `game`; `Game` mantém métodos finos que delegam para cá, preservando a
 * API usada pelos sistemas/managers (`game.spawnEnemyByKey`, etc.).
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
