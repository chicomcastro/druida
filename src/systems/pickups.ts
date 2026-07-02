import { C } from '../core/ecs/components.js';
import { dist, normalize } from '../utils/math.js';

/** Loot/essência são atraídos para o jogador próximo e coletados ao encostar. */
export function pickupSystem(game, dt) {
  const { world } = game;
  for (const [id, pickup, tr] of world.query(C.Pickup, C.Transform)) {
    let nearest = null, nd = Infinity;
    for (const [pid, pTr, pc, hp] of world.query(C.Transform, C.PlayerControlled, C.Health)) {
      if (pc.downed || hp.dead) continue;
      const d = dist(tr.x, tr.z, pTr.x, pTr.z);
      if (d < nd) { nd = d; nearest = { id: pid, tr: pTr }; }
    }
    if (!nearest) continue;
    if (nd < pickup.magnet) {
      const n = normalize(nearest.tr.x - tr.x, nearest.tr.z - tr.z);
      const pull = 8 * (1 - nd / pickup.magnet) + 2;
      tr.x += n.x * pull * dt;
      tr.z += n.z * pull * dt;
    }
    if (nd < 0.7) {
      collect(game, nearest.id, pickup.item);
      world.destroyEntity(id);
    }
  }
}

function collect(game, playerId, item) {
  const inv = game.world.get(playerId, C.Inventory);
  if (item.questItem) {
    // Objetivo de missão de vila (ADR 0047): conta progresso, não vai à bolsa.
    game.emit('questItem', { questId: item.questItem, by: playerId });
    return;
  }
  if (item.lore) {
    if (!game.lore.found.has(item.lore.id)) {
      game.lore.found.add(item.lore.id);
      game.emit('dialogue', { lines: [`📜 ${item.lore.title}`, item.lore.text] });
      game.emit('objective', { text: `Lore descoberta (${game.lore.found.size}) — codex no mapa` });
    }
    inv.essence += 3;
  } else if (item.essence) {
    inv.essence += item.essence;
    game.emit('essence', { id: playerId, amount: item.essence });
  } else {
    inv.items.push(item);
    game.emit('itemPickup', { id: playerId, item });
  }
}
