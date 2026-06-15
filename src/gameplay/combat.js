import { C, Factions } from '../core/ecs/components.js';
import { normalize } from '../utils/math.js';
import { FORMS } from './forms.js';

/** Aplica dano a um alvo, tratando invulnerabilidade, status, morte/queda. */
export function applyDamage(game, targetId, amount, opts = {}) {
  const { world } = game;
  const hp = world.get(targetId, C.Health);
  if (!hp || hp.dead) return false;
  if (hp.invuln > 0 && !opts.ignoreInvuln) return false;

  const pc = world.get(targetId, C.PlayerControlled);
  if (pc && pc.downed) return false;

  // Mitigação: armadura + redução de dano da forma (ex.: Urso).
  const eq = world.get(targetId, C.Equipment);
  if (eq?.mitigation) amount *= 1 - eq.mitigation;
  const form = world.get(targetId, C.Form);
  const fdr = form && FORMS[form.current]?.damageReduction;
  if (fdr) amount *= 1 - fdr;

  hp.hp -= amount;
  const dtr = world.get(targetId, C.Transform);
  game.emit('damage', { id: targetId, amount, x: dtr?.x, z: dtr?.z, ...opts });

  const tint = world.get(targetId, C.Tint);
  if (tint) tint.flash = 0.12;

  // Status on-hit
  if (opts.effect) applyStatus(world, targetId, opts.effect);

  // Knockback
  if (opts.knockback && opts.fromX !== undefined) {
    const tr = world.get(targetId, C.Transform);
    const n = normalize(tr.x - opts.fromX, tr.z - opts.fromZ);
    let kb = world.get(targetId, C.Knockback);
    if (!kb) kb = world.add(targetId, C.Knockback, { vx: 0, vz: 0 });
    kb.vx += n.x * opts.knockback;
    kb.vz += n.z * opts.knockback;
  }

  if (hp.hp <= 0) {
    if (pc) downPlayer(game, targetId);
    else killEntity(game, targetId, opts.attackerId);
  }
  return true;
}

export function applyStatus(world, targetId, effect) {
  const st = world.get(targetId, C.StatusEffects);
  if (!st) return;
  for (const [k, v] of Object.entries(effect)) {
    st[k] = Math.max(st[k] ?? 0, v);
  }
}

export function healEntity(game, id, amount) {
  const hp = game.world.get(id, C.Health);
  if (!hp || hp.dead) return;
  hp.hp = Math.min(hp.max, hp.hp + amount);
  game.emit('heal', { id, amount });
}

function downPlayer(game, id) {
  const pc = game.world.get(id, C.PlayerControlled);
  const hp = game.world.get(id, C.Health);
  pc.downed = true;
  pc.downedTimer = 15; // sangra por 15s; aliado pode reviver
  pc.reviveProgress = 0;
  hp.hp = 0;
  game.emit('playerDowned', { id });
}

function killEntity(game, id, attackerId) {
  const { world } = game;
  const hp = world.get(id, C.Health);
  hp.dead = true;
  const tr = world.get(id, C.Transform);
  const loot = world.get(id, C.LootTable);
  const boss = world.get(id, C.Boss);
  game.emit('kill', { id, attackerId, x: tr?.x ?? 0, z: tr?.z ?? 0, loot, bossName: boss?.name });
  world.destroyEntity(id);
}

/**
 * Ataque corpo-a-corpo instantâneo em arco: aplica dano a inimigos do time
 * oposto dentro de `range` e do semiângulo `arc` em torno de `angle`.
 */
export function meleeArc(game, attackerId, { angle, range, arc, damage, team, effect, knockback }) {
  const { world } = game;
  const tr = world.get(attackerId, C.Transform);
  const dirX = Math.sin(angle);
  const dirZ = Math.cos(angle);
  let hits = 0;
  for (const [id, otherTr, fac, hp] of world.query(C.Transform, C.Faction, C.Health)) {
    if (id === attackerId || fac.team === team || hp.dead) continue;
    const dx = otherTr.x - tr.x;
    const dz = otherTr.z - tr.z;
    const d = Math.hypot(dx, dz);
    if (d > range + (world.get(id, C.Collider)?.radius ?? 0)) continue;
    if (d > 0.01) {
      const dot = (dx / d) * dirX + (dz / d) * dirZ;
      if (dot < Math.cos(arc)) continue;
    }
    applyDamage(game, id, damage, {
      attackerId, effect, knockback, fromX: tr.x, fromZ: tr.z,
    });
    hits++;
  }
  game.emit('meleeSwing', { id: attackerId, x: tr.x, z: tr.z, angle, range, arc, team });
  return hits;
}

export { Factions };
