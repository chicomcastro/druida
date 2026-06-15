import { C } from '../core/ecs/components.js';
import { FORMS } from '../gameplay/forms.js';
import { healEntity } from '../gameplay/combat.js';

/**
 * Núcleo da classe: regenera/consome Seiva, drena Seiva enquanto em forma
 * animal (revertendo ao esgotar), faz tick dos cooldowns e mantém invocações
 * (TTL + aura de cura dos totens).
 */
export function druidSystem(game, dt) {
  const { world } = game;

  // Seiva + formas (jogadores)
  for (const [id, sap, form] of world.query(C.Sap, C.Form)) {
    const def = FORMS[form.current];
    if (def.sapPerSec > 0) {
      sap.value -= def.sapPerSec * dt;
      if (sap.value <= 0) {
        sap.value = 0;
        form.current = 'humanoid';
        form.swapFlash = 0.3;
        game.emit('formSwap', { id, form: 'humanoid', x: game.x(id), z: game.z(id) });
      }
    } else {
      sap.value = Math.min(sap.max, sap.value + sap.regen * dt);
    }
    if (form.swapFlash > 0) form.swapFlash = Math.max(0, form.swapFlash - dt);
  }

  // Cooldowns
  for (const [, cds] of world.query(C.Cooldowns)) {
    for (const k of Object.keys(cds.map)) {
      cds.map[k] -= dt;
      if (cds.map[k] <= 0) delete cds.map[k];
    }
  }

  // Invocações: TTL e aura de cura
  for (const [id, summon] of world.query(C.Summon)) {
    if (summon.ttl !== undefined) {
      summon.ttl -= dt;
      if (summon.ttl <= 0) { world.destroyEntity(id); continue; }
    }
    if (summon.healAura) {
      const tr = world.get(id, C.Transform);
      const r2 = summon.healAura.radius * summon.healAura.radius;
      for (const [pid, pTr, pc, hp] of world.query(C.Transform, C.PlayerControlled, C.Health)) {
        if (pc.downed || hp.dead) continue;
        const dx = pTr.x - tr.x, dz = pTr.z - tr.z;
        if (dx * dx + dz * dz <= r2) healEntity(game, pid, summon.healAura.perSec * dt);
      }
    }
  }
}
