import { C } from '../core/ecs/components.js';
import { applyDamage } from '../gameplay/combat.js';

/** Resolve colisão de projéteis (Hitbox) com alvos e expira por Lifetime. */
export function projectileSystem(game, dt) {
  const { world } = game;
  for (const [id, hb, tr] of world.query(C.Hitbox, C.Transform)) {
    for (const [tid, tTr, fac, hp] of world.query(C.Transform, C.Faction, C.Health)) {
      if (fac.team === hb.team || hp.dead || hb.hit.has(tid)) continue;
      const dx = tTr.x - tr.x, dz = tTr.z - tr.z;
      const rr = hb.radius + (world.get(tid, C.Collider)?.radius ?? 0.4);
      if (dx * dx + dz * dz <= rr * rr) {
        applyDamage(game, tid, hb.damage, { effect: hb.effect, attackerId: id, fromX: tr.x, fromZ: tr.z, knockback: 1.5 });
        hb.hit.add(tid);
        if (hb.pierce > 0) hb.pierce--;
        else { world.destroyEntity(id); break; }
      }
    }
  }

  for (const [id, life] of world.query(C.Lifetime)) {
    life.remaining -= dt;
    if (life.remaining <= 0) world.destroyEntity(id);
  }
}
