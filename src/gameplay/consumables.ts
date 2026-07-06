import { C } from '../core/ecs/components.js';
import { healEntity } from './combat.js';
import { applyBuff } from './buffs.js';
import type { ConsumableItem } from '../types.js';

/**
 * Consumíveis (ADR 0089): poções de efeito instantâneo (cura/Seiva) e, no E18.3,
 * **comidas** que concedem um buff temporário (mais dano, velocidade ou defesa).
 * Todos são consumíveis — entram na hotbar livre como poção (ADR 0132/0133).
 */
export const CONSUMABLE_BASES: Record<string, { name: string; effect: string; magnitude: number; color: number }> = {
  heal_s: { name: 'Seiva Vital', effect: 'heal', magnitude: 40, color: 0xff6a8a },
  heal_l: { name: 'Seiva Vital Densa', effect: 'heal', magnitude: 90, color: 0xff3a6a },
  sap_s: { name: 'Orvalho Concentrado', effect: 'sap', magnitude: 45, color: 0x6affc8 },
};

/** Comidas (E18.3): buff temporário. `pct` é a intensidade; `taken` reduz dano. */
export const FOOD_BASES: Record<string, { name: string; kind: 'dmg' | 'speed' | 'taken'; pct: number; dur: number; color: number; icon: string }> = {
  jerky: { name: 'Carne Seca', kind: 'dmg', pct: 0.20, dur: 45, color: 0xd08a4a, icon: '🍖' },
  herbtea: { name: 'Chá de Ervas', kind: 'speed', pct: 0.20, dur: 40, color: 0x8fe0a0, icon: '🍵' },
  stew: { name: 'Ensopado Quente', kind: 'taken', pct: 0.20, dur: 40, color: 0xffb84a, icon: '🍲' },
};

let _cid = 90000;

/** Gera uma comida (consumível de buff). `pct`/duração escalam leve por nível. */
export function generateFood(kind: keyof typeof FOOD_BASES, level = 1): ConsumableItem {
  const b = FOOD_BASES[kind];
  const pct = +(b.pct * (1 + (level - 1) * 0.05)).toFixed(3);
  return {
    uid: _cid++,
    type: 'consumable',
    name: b.name,
    rarity: 'common',
    rarityColor: b.color,
    level,
    enchants: [],
    power: 1,
    effect: 'buff',
    magnitude: Math.round(pct * 100),
    duration: b.dur,
    stack: 1,
    buff: { kind: b.kind, pct, dur: b.dur, icon: b.icon, color: b.color },
  } as ConsumableItem;
}

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

/** Usa 1 consumível da mochila pelo **nome** do grupo (hotbar livre, E18). */
export function useConsumableNamed(game, id, name: string): boolean {
  const inv = game.world.get(id, C.Inventory);
  const item = (inv?.items ?? []).find((it) => it?.type === 'consumable' && it.name === name);
  if (!item) return false;
  if (!useConsumable(game, id, item)) return false;
  const i = inv.items.indexOf(item);
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
  } else if (item.effect === 'buff' && item.buff) {
    // Comida (E18.3): concede/renova o buff temporário do grupo.
    const bf = item.buff;
    applyBuff(game, {
      id: 'food:' + bf.kind,
      kind: bf.kind,
      mul: bf.kind === 'taken' ? 1 - bf.pct : 1 + bf.pct,
      remaining: bf.dur,
      total: bf.dur,
      name: item.name,
      icon: bf.icon,
      color: bf.color,
    });
  } else {
    return false;
  }
  game.emit?.('consumableUsed', { id, item });
  return true;
}
