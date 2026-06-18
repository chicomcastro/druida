import { C } from './ecs/components.js';
import { BALANCE } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.js';
import { createLootOrb } from '../entities/factories.js';
import { rollDrops } from '../gameplay/loot.js';
import { grantXp } from '../gameplay/progression.js';

/**
 * Cabeamento dos handlers do event bus do jogo (antes em `Game._bindEvents`).
 * Mantido como função pura sobre `game` para enxugar o orquestrador `Game` e
 * deixar as reações a eventos (XP/drops, screen shake, hit-stop, encantamentos
 * reativos) num único lugar coeso.
 */
export function bindGameEvents(game) {
  game.on('kill', (e) => {
    // XP + essência + drops.
    const def = e.loot ?? {};
    grantXp(game, def.xp ?? ENEMIES[e.killKind]?.xp ?? 6);
    const { essenceMin, essenceMax } = BALANCE.loot;
    const essence = Math.max(1, Math.round(essenceMin + Math.random() * (essenceMax - essenceMin)));
    createLootOrb(game.world, game.renderer, { x: e.x + 0.4, z: e.z, item: { essence, rarityColor: 0x9fe06a } });
    for (const item of rollDrops(def, game.regionLevel(), Math.random)) {
      createLootOrb(game.world, game.renderer, { x: e.x - 0.5 + Math.random(), z: e.z + Math.random() - 0.5, item });
    }
  });

  game.on('itemPickup', (e) => {
    // Auto-equipa se o slot estiver vazio (qualidade de vida no protótipo).
    const loadout = game.world.get(e.id, C.Loadout);
    let equipped = false;
    if (e.item.type === 'weapon' && !loadout.weapon) { game.equip(e.id, e.item); equipped = true; }
    else if (e.item.type === 'armor' && !loadout.armor) { game.equip(e.id, e.item); equipped = true; }
    else if (e.item.type === 'artifact') {
      const slot = loadout.artifacts.findIndex((a) => !a);
      if (slot >= 0) { game.equip(e.id, e.item, slot); equipped = true; }
    }
    // Evita duplicar: se auto-equipou, remove da mochila.
    if (equipped) {
      const inv = game.world.get(e.id, C.Inventory);
      const i = inv?.items.indexOf(e.item);
      if (i >= 0) inv.items.splice(i, 1);
    }
  });

  game.on('damage', (e) => {
    // Screen shake quando um jogador toma dano relevante.
    if (e.dot) return;
    if (game.world.has(e.id, C.PlayerControlled) && e.amount >= 8) {
      game.camera.addShake(Math.min(0.5, e.amount / 45));
    }
  });
  game.on('playerDowned', () => game.camera.addShake(0.6));
  game.on('kill', (e) => {
    game.camera.addShake(e.bossName ? 0.8 : 0.18);
    game.hitStop = Math.max(game.hitStop, e.bossName ? 0.12 : 0.045); // hit-stop
  });

  game.on('formSwap', (e) => {
    // Encantamento Metamorfo: onda de dano ao trocar de forma.
    const loadout = game.world.get(e.id, C.Loadout);
    if (loadout?.armor?.enchants?.some((x) => x.id === 'metamorfo' && x.level > 0)) {
      game.aoeDamageAt(e.x, e.z, 3, 14, e.id);
      game.emit('vfxRing', { x: e.x, z: e.z, radius: 3, color: 0xb6ff8a });
    }
  });
}
