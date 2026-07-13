import { C } from '../core/ecs/components.js';
import { SpatialHash } from '../utils/SpatialHash.js';

/**
 * Integra velocidade -> posição, aplica knockback e resolve colisão por
 * círculos (push-out). Broadphase via spatial hash do game para escalar com
 * o mundo aberto. Entidades sem Collider (projéteis, loot) não colidem.
 */
export function movementSystem(game, dt) {
  const { world } = game;

  const corrupt = [];
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

    // Velocidade não-finita (NaN/∞) nunca integra (E64): senão corrompe a
    // posição com NaN e o ente vira um "fantasma" inatingível/onipresente.
    if (!Number.isFinite(vx)) vx = vel.vx = 0;
    if (!Number.isFinite(vz)) vz = vel.vz = 0;
    tr.x += vx * dt;
    tr.z += vz * dt;
    if (!Number.isFinite(tr.x) || !Number.isFinite(tr.z)) corrupt.push({ id, tr });
  }

  // Saneia posições corrompidas (E64): recupera o herói na origem; remove
  // qualquer outro ente-fantasma (some sem 'kill', então sem XP indevido).
  for (const { id, tr } of corrupt) {
    if (world.has(id, C.PlayerControlled)) { tr.x = 0; tr.z = 0; }
    else world.destroyEntity(id);
  }

  resolveCollisions(game);
}

function resolveCollisions(game) {
  const { world } = game;
  const ents = [];
  let maxR = 0.5;
  for (const [id, tr, col] of world.query(C.Transform, C.Collider)) {
    if (!col.solid) continue;
    ents.push({
      id, tr, col,
      static: !world.has(id, C.Velocity),
      player: world.has(id, C.PlayerControlled),
    });
    if (col.radius > maxR) maxR = col.radius;
  }

  // Broadphase com spatial hash (~O(n)); célula >= 2x o maior raio para que
  // colisores próximos caiam em células vizinhas. Cada par é resolvido uma vez
  // (id < otherId).
  const grid = game._collisionGrid ?? (game._collisionGrid = new SpatialHash(Math.max(2, maxR * 2)));
  grid.cell = Math.max(2, maxR * 2);
  grid.clear();
  const byId = new Map();
  for (const e of ents) { grid.insert(e.id, e.tr.x, e.tr.z); byId.set(e.id, e); }

  const scratch = [];
  for (const a of ents) {
    scratch.length = 0;
    grid.queryRadius(a.tr.x, a.tr.z, a.col.radius + maxR, scratch);
    for (const otherId of scratch) {
      if (otherId <= a.id) continue; // resolve cada par uma vez
      const b = byId.get(otherId);
      if (!b) continue;
      const dx = b.tr.x - a.tr.x;
      const dz = b.tr.z - a.tr.z;
      const min = a.col.radius + b.col.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      if (a.static && b.static) continue;
      // Coincidentes (d≈0): antes o par era PULADO (sem direção de empurrão),
      // então dois entes no mesmo ponto ficavam grudados — dois modelos iguais no
      // mesmo lugar brigam no z-buffer e PISCAM (E62, aldeões "um dentro do
      // outro"). Aqui uma normal determinística (por id) dá o rumo do desempate.
      let d = Math.sqrt(d2), nx, nz;
      if (d < 1e-4) {
        const ang = ((a.id * 2654435761) % 360) * (Math.PI / 180); // hash → ângulo estável
        nx = Math.cos(ang); nz = Math.sin(ang); d = 0;
      } else {
        nx = dx / d; nz = dz / d;
      }
      const overlap = (min - d) / 2;
      // Estático (parede/casa/árvore) NUNCA se move → só o outro recua (2×), mesmo
      // que o outro seja o herói (senão ele atravessaria a estrutura).
      // Já entre DINÂMICOS, o herói é IMÓVEL para NPCs/inimigos (E67): antes um
      // aldeão esbarrando empurrava o herói pela tela ("os npcs entram no player e
      // o arrastam"). Contra o herói, só o NPC recua; herói↔herói empurram os dois.
      if (a.static) {
        b.tr.x += nx * overlap * 2; b.tr.z += nz * overlap * 2;
      } else if (b.static) {
        a.tr.x -= nx * overlap * 2; a.tr.z -= nz * overlap * 2;
      } else if (a.player && !b.player) {
        b.tr.x += nx * overlap * 2; b.tr.z += nz * overlap * 2;
      } else if (b.player && !a.player) {
        a.tr.x -= nx * overlap * 2; a.tr.z -= nz * overlap * 2;
      } else {
        a.tr.x -= nx * overlap; a.tr.z -= nz * overlap;
        b.tr.x += nx * overlap; b.tr.z += nz * overlap;
      }
    }
  }
}
