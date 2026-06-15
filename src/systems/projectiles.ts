import { C } from '../core/ecs/components.js';
import { applyDamage } from '../gameplay/combat.js';
import { SpatialHash } from '../utils/SpatialHash.js';

/** Resolve colisão de projéteis (Hitbox) com alvos e expira por Lifetime. */
export function projectileSystem(game, dt) {
  const { world } = game;

  // Broadphase: indexa alvos atacáveis uma vez por frame.
  const grid = game._targetGrid ?? (game._targetGrid = new SpatialHash(4));
  grid.clear();
  for (const [tid, tTr] of world.query(C.Transform, C.Faction, C.Health)) {
    grid.insert(tid, tTr.x, tTr.z);
  }

  const scratch = [];
  for (const [id, hb, tr] of world.query(C.Hitbox, C.Transform)) {
    scratch.length = 0;
    grid.queryRadius(tr.x, tr.z, hb.radius + 1, scratch);
    for (const tid of scratch) {
      const fac = world.get(tid, C.Faction);
      const hp = world.get(tid, C.Health);
      if (!fac || !hp || fac.team === hb.team || hp.dead || hb.hit.has(tid)) continue;
      const tTr = world.get(tid, C.Transform);
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
