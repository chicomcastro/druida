import { C } from '../core/ecs/components.js';
import { dist } from '../utils/math.js';
import { revealLore } from '../data/lore.js';

/**
 * Detecta o jogador próximo de um Interactable e dispara a ação ao pressionar
 * E/F. Também publica o prompt mais próximo para o HUD exibir.
 */
export function interactionSystem(game, dt) {
  const { world } = game;
  let prompt = null, promptD = Infinity;

  for (const [, pTr, pc, hp, intent] of world.query(C.Transform, C.PlayerControlled, C.Health, C.Intent)) {
    if (pc.downed || hp.dead) continue;
    for (const [iid, itr, inter] of world.query(C.Transform, C.Interactable)) {
      if (inter.used) continue;
      const d = dist(pTr.x, pTr.z, itr.x, itr.z);
      if (d > (inter.range ?? 3)) continue;
      if (d < promptD) { promptD = d; prompt = inter.prompt; }
      if (intent.interact) {
        if (inter.kind === 'merchant') {
          if (inter.lines) game.emit('dialogue', { lines: inter.lines }); // fofoca da família (ADR 0095)
          game.setActiveShop?.(inter.shopId ?? 'hub'); game.menus.openShop();
        }
        else if (inter.kind === 'chest') game.menus.openStash();
        else if (inter.kind === 'dungeon') game.dungeon.enter(inter.entranceId);
        else if (inter.kind === 'dungeon_reward') game.dungeon.claimReward();
        else if (inter.kind === 'villager') game.emit('dialogue', { lines: inter.lines });
        else if (inter.kind === 'house') game.interiors.enter(inter.interiorTheme, inter.houseLabel);
        else if (inter.kind === 'house_exit') game.interiors.exit();
        else if (inter.kind === 'tavern') { game.emit('dialogue', { lines: inter.lines }); game.interiors.rest(); }
        else if (inter.kind === 'kitchen') game.menus.openKitchen();
        else if (inter.kind === 'forage') game.forage.collect(iid);
        else if (inter.kind === 'plot') game.menus.openFarm(inter.plotId);
        else if (inter.kind === 'quest_giver') game.quests?.onTalk(inter);
        else game.story.onInteract(inter, pc.index);
        if (inter.loreId) revealLore(game, inter.loreId); // segredos da rixa (ADR 0095)
        if (inter.npc) game.emit('talkedNpc', { npc: inter.npc }); // triggers de side quest (ADR 0096)
        game.emit('interacted', { iid, by: pc.index });
      }
    }
  }
  game.interactPrompt = prompt;
}
