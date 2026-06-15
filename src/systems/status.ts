import { C } from '../core/ecs/components.js';
import { applyDamage } from '../gameplay/combat.js';

/** Aplica DoTs (burn/poison) e decai durações de status (freeze/root/stun). */
export function statusSystem(game, dt) {
  const { world } = game;
  for (const [id, st, hp] of world.query(C.StatusEffects, C.Health)) {
    if (hp.dead) continue;
    if (st.burn > 0) {
      applyDamage(game, id, 6 * dt, { ignoreInvuln: true, dot: true });
      st.burn = Math.max(0, st.burn - dt);
    }
    if (st.poison > 0) {
      applyDamage(game, id, 4 * dt, { ignoreInvuln: true, dot: true });
      st.poison = Math.max(0, st.poison - dt);
    }
    st.freeze = Math.max(0, st.freeze - dt);
    st.root = Math.max(0, st.root - dt);
    st.stun = Math.max(0, st.stun - dt);
    if (hp.invuln > 0) hp.invuln = Math.max(0, hp.invuln - dt);
  }
}
