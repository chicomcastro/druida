import { unlockedAbilities } from './skillTree.js';
import { ABILITIES } from './abilities/index.js';

/**
 * Hotbar 1–9 estilo Minecraft (E17.3). Slots persistentes onde o jogador atribui
 * as **habilidades ativas já liberadas** na árvore (ADR 0124/0125) para conjurar
 * com as teclas 1–9. Guardada em `game.progress.hotbar` (party) para persistir
 * no save.
 *
 * Esta fatia (E17.3a) é o **modelo de dados + regras de atribuição**, testável e
 * isolado. A fiação da entrada (Digit1–9 → conjurar o slot) e o desenho na HUD
 * vêm em E17.3b — assim a parte arriscada (remapear input) fica revisável à
 * parte, sem misturar com a lógica pura.
 */

export const HOTBAR_SIZE = 9;

/** Garante os 9 slots no progresso (save antigo não tinha). */
export function ensureHotbar(game): (string | null)[] {
  const p = game.progress;
  if (!Array.isArray(p.hotbar) || p.hotbar.length !== HOTBAR_SIZE) {
    const prev = Array.isArray(p.hotbar) ? p.hotbar : [];
    p.hotbar = Array.from({ length: HOTBAR_SIZE }, (_, i) => prev[i] ?? null);
  }
  return p.hotbar;
}

/** Habilidade no slot (ou null). Slots fora de faixa devolvem null. */
export function hotbarAbility(game, slot: number): string | null {
  const hb = ensureHotbar(game);
  if (slot < 0 || slot >= HOTBAR_SIZE) return null;
  return hb[slot] ?? null;
}

/**
 * Atribui uma habilidade a um slot. Só aceita habilidade **existente** e
 * **liberada** na árvore. Se a mesma habilidade já estava em outro slot, ela é
 * movida (sem duplicar). Devolve true no sucesso.
 */
export function assignSkill(game, slot: number, abilityId: string): boolean {
  const hb = ensureHotbar(game);
  if (slot < 0 || slot >= HOTBAR_SIZE) return false;
  if (!ABILITIES[abilityId]) return false;
  if (!unlockedAbilities(game).includes(abilityId)) return false;
  for (let i = 0; i < HOTBAR_SIZE; i++) if (hb[i] === abilityId) hb[i] = null; // sem duplicar
  hb[slot] = abilityId;
  game.emit?.('hotbarChanged', { slot, abilityId });
  return true;
}

/** Esvazia um slot. */
export function clearSlot(game, slot: number): boolean {
  const hb = ensureHotbar(game);
  if (slot < 0 || slot >= HOTBAR_SIZE) return false;
  hb[slot] = null;
  game.emit?.('hotbarChanged', { slot, abilityId: null });
  return true;
}

/**
 * Preenche slots vazios com as habilidades liberadas ainda não atribuídas —
 * conveniência para quando o jogador libera uma skill nova (auto-equipar).
 * Não desloca o que já está posto. Devolve quantas colocou.
 */
export function autoFillHotbar(game): number {
  const hb = ensureHotbar(game);
  const already = new Set(hb.filter(Boolean));
  const pending = unlockedAbilities(game).filter((a) => !already.has(a));
  let placed = 0;
  for (let i = 0; i < HOTBAR_SIZE && pending.length; i++) {
    if (!hb[i]) { hb[i] = pending.shift()!; placed++; }
  }
  if (placed) game.emit?.('hotbarChanged', { slot: -1, abilityId: null });
  return placed;
}

/** Remove do hotbar habilidades que deixaram de estar liberadas (respec). */
export function pruneHotbar(game): void {
  const hb = ensureHotbar(game);
  const ok = new Set(unlockedAbilities(game));
  for (let i = 0; i < HOTBAR_SIZE; i++) if (hb[i] && !ok.has(hb[i]!)) hb[i] = null;
}
