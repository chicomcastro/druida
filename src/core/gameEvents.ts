import { C } from './ecs/components.js';
import { BALANCE } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.js';
import { createLootOrb } from '../entities/factories.js';
import { rollDrops } from '../gameplay/loot.js';
import { grantXp } from '../gameplay/progression.js';
import { DROP_INGREDIENTS } from '../gameplay/ingredients.js';
import { gainProficiency } from '../gameplay/skills.js';

/**
 * Cabeamento dos handlers do event bus do jogo (antes em `Game._bindEvents`).
 * Mantido como função pura sobre `game` para enxugar o orquestrador `Game` e
 * deixar as reações a eventos (XP/drops, screen shake, hit-stop, encantamentos
 * reativos) num único lugar coeso.
 */
export function bindGameEvents(game) {
  // Teleportes (fast-travel) saltam a câmera: sem panorâmica pelo mapa.
  game.on('fastTravel', (e) => game.camera?.snapTo?.({ x: e.x, z: e.z }));

  game.on('kill', (e) => {
    // Fauna caçável (ADR 0157) tem loot próprio (ingredientes da espécie, tratados
    // no FaunaManager) — não ganha XP/essência/drop genérico de monstro.
    if (game.fauna?.isFauna?.(e.id)) return;
    // XP + essência + drops.
    const def = e.loot ?? {};
    grantXp(game, def.xp ?? ENEMIES[e.killKind]?.xp ?? 6);
    const { essenceMin, essenceMax } = BALANCE.loot;
    // Elites carregam bônus de essência (ADR 0045).
    const essence = Math.max(1, Math.round(essenceMin + Math.random() * (essenceMax - essenceMin))) + (def.essenceBonus ?? 0);
    createLootOrb(game.world, game.renderer, { x: e.x + 0.4, z: e.z, item: { essence, rarityColor: 0x9fe06a } });
    for (const item of rollDrops(def, game.regionLevel(), Math.random)) {
      createLootOrb(game.world, game.renderer, { x: e.x - 0.5 + Math.random(), z: e.z + Math.random() - 0.5, item });
    }
    // Ingredientes (E19): inimigos soltam partes (carne/couro/pena) que viram
    // comida na cozinha. Comida pronta não cai mais.
    if (DROP_INGREDIENTS.length && Math.random() < (def.ingredientChance ?? 0.35)) {
      const ing = DROP_INGREDIENTS[Math.floor(Math.random() * DROP_INGREDIENTS.length)];
      createLootOrb(game.world, game.renderer, {
        x: e.x + Math.random() - 0.5, z: e.z + Math.random() - 0.5,
        item: { ingredient: ing.id, name: ing.name, icon: ing.icon, rarityColor: 0xd0b060 },
      });
    }
  });

  game.on('itemPickup', (e) => {
    // Auto-equipa se o slot estiver vazio (qualidade de vida no protótipo).
    const loadout = game.world.get(e.id, C.Loadout);
    let equipped = false;
    if (e.item.type === 'weapon' && !loadout.weapon) { game.equip(e.id, e.item); equipped = true; }
    else if (e.item.type === 'armor' && !loadout.armor?.[e.item.slot ?? 'body']) { game.equip(e.id, e.item); equipped = true; }
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
    // Proficiência ao ACERTAR (ADR 0162): só quando um jogador atinge um alvo
    // que não é jogador — golpe no ar não conta mais. Trilha = forma ativa ou
    // família da arma equipada.
    const atk = e.attackerId;
    if (atk != null && game.world.has(atk, C.PlayerControlled) && !game.world.has(e.id, C.PlayerControlled)) {
      const form = game.world.get(atk, C.Form);
      const eq = game.world.get(atk, C.Equipment);
      const track = form && form.current !== 'humanoid' ? form.current : eq?.weapon?.family;
      if (track) gainProficiency(game, track);
    }
  });
  game.on('playerDowned', () => game.camera.addShake(0.6));
  // Combo (ADR 0092): micro hit-stop + shake sutil escalando com a contagem —
  // o "peso" do encadeamento no timing certo.
  game.on('combo', (e) => {
    game.hitStop = Math.max(game.hitStop, 0.03 + 0.006 * Math.min(e.count, 8));
    // Shake bem sutil: o combo dispara a CADA acerto encadeado, então o tranco
    // antigo (0.08–0.2) somava e deixava a tela tremendo o tempo todo ao atacar
    // (E59). O peso do combo já vem do hit-stop; o shake fica só como tempero.
    game.camera.addShake(0.02 + 0.006 * Math.min(e.count, 6));
  });
  game.on('kill', (e) => {
    // Morte comum quase não treme (some entre golpes num pack); chefe é evento.
    game.camera.addShake(e.bossName ? 0.8 : 0.08);
    game.hitStop = Math.max(game.hitStop, e.bossName ? 0.12 : 0.045); // hit-stop
  });

  game.on('formSwap', (e) => {
    // Encantamento Metamorfo: onda de dano ao trocar de forma (qualquer peça).
    const loadout = game.world.get(e.id, C.Loadout);
    const armorList = loadout?.armor?.enchants ? [loadout.armor] // compat item único
      : Object.values(loadout?.armor ?? {}).filter(Boolean);
    if (armorList.some((p: any) => p?.enchants?.some((x) => x.id === 'metamorfo' && x.level > 0))) {
      game.aoeDamageAt(e.x, e.z, 3, 14, e.id);
      game.emit('vfxRing', { x: e.x, z: e.z, radius: 3, color: 0xb6ff8a });
    }
  });
}
