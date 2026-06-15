import { C, Factions } from '../core/ecs/components.js';
import { dist } from '../utils/math.js';
import { applyDamage } from '../gameplay/combat.js';

/**
 * IA de chefes (O Apodrecedor) e mini-chefes (Árvore-Carniça), por cima da IA
 * de perseguição/melee base. Fases por % de vida mudam ritmo e adicionam
 * golpes em área e invocações.
 */
export function bossSystem(game, dt) {
  const { world } = game;
  for (const [id, boss, hp, tr] of world.query(C.Boss, C.Health, C.Transform)) {
    if (hp.dead) continue;
    const pct = hp.hp / hp.max;
    const phase = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (phase !== boss.phase) {
      boss.phase = phase;
      const ai = world.get(id, C.AI);
      if (ai) ai.attackCooldown *= 0.82;
      game.emit('objective', { text: `${boss.name} entra na Fase ${phase}!` });
    }

    // Golpe em área (slam) com telegrafo.
    boss.slamTimer = (boss.slamTimer ?? 2) - dt;
    if (boss.slamTimer <= 0) {
      boss.slamTimer = boss.miniBoss ? 3.8 : phase === 3 ? 2.2 : 3.6;
      const target = nearestPlayer(world, tr);
      if (target) {
        const tx = target.tr.x, tz = target.tr.z;
        const radius = boss.miniBoss ? 3.5 : 4.2;
        const dmg = boss.miniBoss ? 14 : 16 + phase * 5;
        const effect = boss.miniBoss ? { root: 2 } : phase === 3 ? { burn: 3 } : null;
        game.emit('vfxMarker', { x: tx, z: tz, radius, delay: 0.7 });
        game.schedule(0.7, () => {
          aoePlayers(game, tx, tz, radius, dmg, id, effect);
          game.emit('vfxRing', { x: tx, z: tz, radius, color: boss.miniBoss ? 0x9fe06a : 0xff5a2a });
        });
      }
    }

    // Invocações: chefe final convoca esporos a partir da Fase 2.
    if (!boss.miniBoss && phase >= 2) {
      boss.summonTimer = (boss.summonTimer ?? 0) - dt;
      if (boss.summonTimer <= 0 && countEnemies(world) < 26) {
        boss.summonTimer = 7;
        for (let i = 0; i < 2; i++) {
          game.spawnEnemyByKey('fungling', tr.x + (Math.random() - 0.5) * 4, tr.z + (Math.random() - 0.5) * 4);
        }
      }
    }
  }
}

function aoePlayers(game, x, z, radius, dmg, attackerId, effect) {
  const r2 = radius * radius;
  for (const [pid, tr, pc, hp] of game.world.query(C.Transform, C.PlayerControlled, C.Health)) {
    if (pc.downed || hp.dead) continue;
    const dx = tr.x - x, dz = tr.z - z;
    if (dx * dx + dz * dz <= r2) applyDamage(game, pid, dmg, { attackerId, fromX: x, fromZ: z, knockback: 5, effect });
  }
}

function nearestPlayer(world, tr) {
  let best = null, bd = Infinity;
  for (const [, pTr, pc, hp] of world.query(C.Transform, C.PlayerControlled, C.Health)) {
    if (pc.downed || hp.dead) continue;
    const d = dist(tr.x, tr.z, pTr.x, pTr.z);
    if (d < bd) { bd = d; best = { tr: pTr }; }
  }
  return best;
}

function countEnemies(world) {
  let n = 0;
  for (const [, fac] of world.query(C.Faction)) if (fac.team === Factions.ENEMY) n++;
  return n;
}
