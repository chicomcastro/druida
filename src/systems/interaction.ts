import { C } from '../core/ecs/components.js';
import { dist } from '../utils/math.js';

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
        if (inter.kind === 'merchant') game.menus.openShop();
        else if (inter.kind === 'chest') game.menus.openStash();
        else if (inter.kind === 'dungeon') game.dungeon.enter(inter.entranceId);
        else if (inter.kind === 'dungeon_reward') game.dungeon.claimReward();
        else game.story.onInteract(inter, pc.index);
        game.emit('interacted', { iid, by: pc.index });
      }
    }
  }
  game.interactPrompt = prompt;
}
