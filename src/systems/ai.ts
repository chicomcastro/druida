import { C, Factions } from '../core/ecs/components.js';
import { dist, normalize } from '../utils/math.js';
import { applyDamage, meleeArc } from '../gameplay/combat.js';
import { createProjectile } from '../entities/factories.js';

/**
 * IA simples baseada em estados. Inimigos perseguem o jogador mais próximo;
 * "ally_*" (invocações) perseguem o inimigo mais próximo. Comportamentos:
 * melee, ranged, exploder, summoner, ally_melee. Chefes têm IA própria.
 */
export function aiSystem(game, dt) {
  const { world } = game;
  for (const [id, ai, tr, vel] of world.query(C.AI, C.Transform, C.Velocity)) {
    const st = world.get(id, C.StatusEffects);
    ai.timer = Math.max(0, ai.timer - dt);

    const isAlly = ai.behavior.startsWith('ally');
    const target = isAlly ? nearestEnemy(world, tr) : nearestPlayer(game, tr);
    if (!target) { vel.vx = vel.vz = 0; continue; }

    const d = dist(tr.x, tr.z, target.tr.x, target.tr.z);
    const rooted = st && (st.root > 0 || st.stun > 0);
    const slow = st && st.freeze > 0 ? 0.5 : 1;

    if (d > ai.aggroRange && !isAlly) { vel.vx = vel.vz = 0; ai.state = 'idle'; continue; }

    const n = normalize(target.tr.x - tr.x, target.tr.z - tr.z);
    tr.rot = Math.atan2(n.x, n.z);

    if (ai.behavior === 'ranged') {
      // Mantém distância média.
      const want = ai.attackRange * 0.8;
      let move = 0;
      if (d > want + 1.5) move = 1; else if (d < want - 1.5) move = -1;
      vel.vx = rooted ? 0 : n.x * vel.speed * slow * move;
      vel.vz = rooted ? 0 : n.z * vel.speed * slow * move;
      if (d <= ai.aggroRange && ai.timer <= 0) {
        ai.timer = ai.attackCooldown;
        createProjectile(game.world, game.renderer, {
          x: tr.x, z: tr.z, dirX: n.x, dirZ: n.z, speed: 10,
          damage: ai.damage, team: Factions.ENEMY, color: ai.projectileColor, range: ai.aggroRange + 2,
        });
      }
      continue;
    }

    if (ai.behavior === 'summoner') {
      vel.vx = rooted ? 0 : -n.x * vel.speed * slow * 0.5; // recua
      vel.vz = rooted ? 0 : -n.z * vel.speed * slow * 0.5;
      if (ai.timer <= 0 && countEnemies(world) < 24) {
        ai.timer = ai.attackCooldown;
        game.spawnEnemyByKey?.(ai.summon ?? 'rotboar', tr.x + (Math.random() - 0.5) * 3, tr.z + (Math.random() - 0.5) * 3);
      }
      continue;
    }

    // melee / exploder / ally_melee
    if (d > ai.attackRange) {
      vel.vx = rooted ? 0 : n.x * vel.speed * slow;
      vel.vz = rooted ? 0 : n.z * vel.speed * slow;
      ai.state = 'chase';
    } else {
      vel.vx = vel.vz = 0;
      if (ai.behavior === 'exploder') {
        // explode ao alcançar
        const team = isAlly ? Factions.PLAYER : Factions.ENEMY;
        meleeArc(game, id, { angle: tr.rot, range: ai.attackRange + 1, arc: Math.PI, damage: ai.damage, team });
        world.destroyEntity(id);
        continue;
      }
      if (ai.timer <= 0) {
        ai.timer = ai.attackCooldown;
        applyDamage(game, target.id, ai.damage, { attackerId: id, fromX: tr.x, fromZ: tr.z, knockback: 2 });
        game.emit('enemyAttack', { id, x: tr.x, z: tr.z });
      }
    }
  }
}

function nearestPlayer(game, tr) {
  const { world } = game;
  let best = null, bestD = Infinity;
  for (const [id, pTr, pc, hp] of world.query(C.Transform, C.PlayerControlled, C.Health)) {
    if (pc.downed || hp.dead) continue;
    const d = dist(tr.x, tr.z, pTr.x, pTr.z);
    if (d < bestD) { bestD = d; best = { id, tr: pTr }; }
  }
  return best;
}

function nearestEnemy(world, tr) {
  let best = null, bestD = Infinity;
  for (const [id, eTr, fac, hp] of world.query(C.Transform, C.Faction, C.Health)) {
    if (fac.team !== Factions.ENEMY || hp.dead) continue;
    const d = dist(tr.x, tr.z, eTr.x, eTr.z);
    if (d < bestD) { bestD = d; best = { id, tr: eTr }; }
  }
  return best;
}

function countEnemies(world) {
  let n = 0;
  for (const [, fac] of world.query(C.Faction)) if (fac.team === Factions.ENEMY) n++;
  return n;
}
