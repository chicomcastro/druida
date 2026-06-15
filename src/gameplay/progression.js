import { C } from '../core/ecs/components.js';

/**
 * Progressão de grupo (party). XP é compartilhado; subir de nível concede
 * pontos de encanto a todos os jogadores. O poder vem do equipamento, não de
 * stats brutos do nível — fiel ao MC Dungeons. Ver docs/game-design.md §9.
 */
export function xpForLevel(level) {
  return Math.round(40 * Math.pow(level, 1.5));
}

export function grantXp(game, amount) {
  const p = game.progress;
  p.xp += amount;
  let leveled = false;
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.enchantPoints += 1;
    leveled = true;
    // Distribui ponto de encanto a cada jogador.
    for (const [, loadout] of game.world.query(C.Loadout)) loadout.enchantPoints += 1;
  }
  if (leveled) game.emit('levelUp', { level: p.level });
}

/** Nível recomendado de uma região define o item level dos drops. */
export function regionLevel(game) {
  return Math.max(1, Math.min(game.progress.level, game.region?.level ?? 1) + (game.region?.levelBonus ?? 0));
}
