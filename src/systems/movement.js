import { C } from '../core/ecs/components.js';

/**
 * Integra velocidade -> posição, aplica knockback e resolve colisão por
 * círculos (push-out). Broadphase via spatial hash do game para escalar com
 * o mundo aberto. Entidades sem Collider (projéteis, loot) não colidem.
 */
export function movementSystem(game, dt) {
  const { world } = game;

  for (const [id, tr, vel] of world.query(C.Transform, C.Velocity)) {
    const st = world.get(id, C.StatusEffects);
    let vx = vel.vx, vz = vel.vz;

    // Knockback aditivo com decaimento.
    const kb = world.get(id, C.Knockback);
    if (kb) {
      vx += kb.vx;
      vz += kb.vz;
      const decay = Math.pow(0.0008, dt);
      kb.vx *= decay;
      kb.vz *= decay;
      if (Math.hypot(kb.vx, kb.vz) < 0.05) world.remove(id, C.Knockback);
    }

    if (st && (st.stun > 0)) {
      // atordoado: só knockback empurra
      vx = kb ? kb.vx : 0;
      vz = kb ? kb.vz : 0;
    }

    tr.x += vx * dt;
    tr.z += vz * dt;
  }

  resolveCollisions(game);
}

function resolveCollisions(game) {
  const { world } = game;
  const ents = [];
  for (const [id, tr, col] of world.query(C.Transform, C.Collider)) {
    if (!col.solid) continue;
    ents.push({ id, tr, col, fac: world.get(id, C.Faction)?.team });
  }
  // O(n^2) é aceitável para a contagem do protótipo; trocar por spatial hash
  // quando hordas crescerem (ver backlog M9).
  for (let i = 0; i < ents.length; i++) {
    for (let j = i + 1; j < ents.length; j++) {
      const a = ents[i], b = ents[j];
      const dx = b.tr.x - a.tr.x;
      const dz = b.tr.z - a.tr.z;
      const min = a.col.radius + b.col.radius;
      let d2 = dx * dx + dz * dz;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2) || 0.0001;
      const overlap = (min - d) / 2;
      const nx = dx / d, nz = dz / d;
      // Obstáculos estáticos (sem Velocity) não se movem.
      const aStatic = !world.has(a.id, C.Velocity);
      const bStatic = !world.has(b.id, C.Velocity);
      if (aStatic && bStatic) continue;
      if (aStatic) {
        b.tr.x += nx * overlap * 2; b.tr.z += nz * overlap * 2;
      } else if (bStatic) {
        a.tr.x -= nx * overlap * 2; a.tr.z -= nz * overlap * 2;
      } else {
        a.tr.x -= nx * overlap; a.tr.z -= nz * overlap;
        b.tr.x += nx * overlap; b.tr.z += nz * overlap;
      }
    }
  }
}
