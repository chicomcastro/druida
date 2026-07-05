import { C } from '../core/ecs/components.js';
import { healEntity } from './combat.js';
import type { ConsumableItem } from '../types.js';

/**
 * Consumíveis (ADR 0089): poções de efeito instantâneo. Comida com buff
 * temporário fica para a taverna (E5), que traz o sistema de buffs. Aqui
 * ficam os efeitos imediatos — cura e restauração de Seiva — usáveis da
 * mochila (e, no E2, da hotbar 1–9).
 */
export const CONSUMABLE_BASES: Record<string, { name: string; effect: string; magnitude: number; color: number }> = {
  heal_s: { name: 'Seiva Vital', effect: 'heal', magnitude: 40, color: 0xff6a8a },
  heal_l: { name: 'Seiva Vital Densa', effect: 'heal', magnitude: 90, color: 0xff3a6a },
  sap_s: { name: 'Orvalho Concentrado', effect: 'sap', magnitude: 45, color: 0x6affc8 },
};

let _cid = 90000;

export function generateConsumable(kind: keyof typeof CONSUMABLE_BASES, level = 1): ConsumableItem {
  const base = CONSUMABLE_BASES[kind];
  return {
    uid: _cid++,
    type: 'consumable',
    name: base.name,
    rarity: 'common',
    rarityColor: base.color,
    level,
    enchants: [],
    power: 1,
    effect: base.effect,
    magnitude: Math.round(base.magnitude * (1 + (level - 1) * 0.1)),
    stack: 1,
  } as ConsumableItem;
}

/** Consumíveis da mochila agrupados por nome (para a hotbar 1–9). */
export function bagConsumables(inv): { item: any; count: number; index: number }[] {
  const groups: Record<string, { item: any; count: number; index: number }> = {};
  (inv?.items ?? []).forEach((it, i) => {
    if (it?.type !== 'consumable') return;
    if (!groups[it.name]) groups[it.name] = { item: it, count: 0, index: i };
    groups[it.name].count++;
  });
  return Object.values(groups);
}

/** Usa o consumível da posição `slot` da hotbar (grupo). Remove 1 da mochila. */
export function useHotbarSlot(game, id, slot: number): boolean {
  const inv = game.world.get(id, C.Inventory);
  const groups = bagConsumables(inv);
  const g = groups[slot];
  if (!g) return false;
  if (!useConsumable(game, id, g.item)) return false;
  const i = inv.items.indexOf(g.item);
  if (i >= 0) inv.items.splice(i, 1);
  return true;
}

/** Aplica o efeito de um consumível ao jogador. Retorna true se consumido. */
export function useConsumable(game, id, item: ConsumableItem): boolean {
  if (!item || item.type !== 'consumable') return false;
  if (item.effect === 'heal') {
    const hp = game.world.get(id, C.Health);
    if (hp && hp.hp >= hp.max) return false; // não desperdiça em vida cheia
    healEntity(game, id, item.magnitude);
  } else if (item.effect === 'sap') {
    const sap = game.world.get(id, C.Sap);
    if (sap && sap.value >= sap.max) return false;
    game.gainSap(id, item.magnitude);
  } else {
    return false;
  }
  game.emit?.('consumableUsed', { id, item });
  return true;
}
