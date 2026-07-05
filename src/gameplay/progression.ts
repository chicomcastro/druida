import { C } from '../core/ecs/components.js';
import { BALANCE } from '../data/balance.js';
import { ensureSkillState } from './skills.js';

/**
 * Progressão de grupo (party). XP é compartilhado; subir de nível concede
 * pontos de encanto a todos os jogadores. O poder vem do equipamento, não de
 * stats brutos do nível — fiel ao MC Dungeons. Ver docs/game-design.md §9.
 */
export function xpForLevel(level) {
  const { xpBase, xpExp } = BALANCE.progression;
  return Math.round(xpBase * Math.pow(level, xpExp));
}

export function grantXp(game, amount) {
  const p = game.progress;
  p.xp += amount;
  let leveled = false;
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.enchantPoints += BALANCE.progression.enchantPointsPerLevel;
    ensureSkillState(game);
    p.skillPoints++; // 1 ponto de talento por nível (ADR 0093)
    leveled = true;
    // Distribui ponto de encanto a cada jogador.
    for (const [, loadout] of game.world.query(C.Loadout)) {
      loadout.enchantPoints += BALANCE.progression.enchantPointsPerLevel;
    }
  }
  if (leveled) game.emit('levelUp', { level: p.level });
}

/** Nível recomendado de uma região define o item level dos drops. */
export function regionLevel(game) {
  return Math.max(1, Math.min(game.progress.level, game.region?.level ?? 1) + (game.region?.levelBonus ?? 0));
}
