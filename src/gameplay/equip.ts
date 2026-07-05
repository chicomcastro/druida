import { C } from '../core/ecs/components.js';
import { BALANCE } from '../data/balance.js';
import { sumMod } from './modifiers.js';
import { ARMOR_SLOTS } from './loot.js';

const BASE_HP = BALANCE.player.baseHp;
const BASE_SAP_REGEN = BALANCE.player.baseSapRegen;

/** Lista das peças de armadura equipadas (ignora vazias). */
export function armorPieces(eq): any[] {
  const set = eq?.armor;
  if (!set) return [];
  // Compat: armor legado como item único.
  if (set.type === 'armor') return [set];
  return ARMOR_SLOTS.map((s) => set[s]).filter(Boolean);
}

/** Todos os itens equipados (arma + armaduras + artefatos) — para somar afixos. */
export function equippedItems(eq): any[] {
  return [eq?.weapon, ...armorPieces(eq), ...(eq?.artifacts ?? [])].filter(Boolean);
}

/**
 * Recalcula stats derivados do equipamento (vida máx, regen de Seiva,
 * mitigação, velocidade). Agrega as 4 peças anatômicas de armadura (ADR 0087)
 * e os modificadores de raridade (ADR 0088). Chamado a cada equip/desequip.
 */
export function applyEquipment(game, id) {
  const hp = game.world.get(id, C.Health);
  const sap = game.world.get(id, C.Sap);
  const eq = game.world.get(id, C.Equipment);
  if (!hp || !sap || !eq) return;

  const pieces = armorPieces(eq);
  const all = equippedItems(eq);

  let maxHp = BASE_HP;
  for (const p of pieces) {
    if (p.bonus === 'health') maxHp += p.bonusValue ?? 0;
    const vigor = p.enchants?.find((e) => e.id === 'vigor' && e.level > 0);
    if (vigor) maxHp += 30 * vigor.level;
  }
  maxHp += sumMod(all, 'vitality'); // afixo Vitalidade
  // Dom Casca de Carvalho (ADR 0050): +20% de vida máxima.
  if (Object.values(game.boons ?? {}).includes('casca')) maxHp = Math.round(maxHp * 1.2);

  const ratio = hp.max > 0 ? hp.hp / hp.max : 1;
  hp.max = maxHp;
  hp.hp = Math.min(maxHp, Math.round(maxHp * ratio));

  let regen = BASE_SAP_REGEN;
  for (const p of pieces) if (p.bonus === 'sapRegen') regen += (p.bonusValue ?? 0) * 0.4;
  regen *= 1 + sumMod(all, 'wellspring') / 100; // afixo Manancial
  // Dom Orvalho Eterno (ADR 0050): +30% de regeneração de Seiva.
  if (Object.values(game.boons ?? {}).includes('orvalho')) regen *= 1.3;
  sap.regen = regen;

  // Mitigação: soma das peças + afixos Baluarte, teto de 80%.
  let mit = pieces.reduce((s, p) => s + (p.armor ?? 0), 0);
  mit += sumMod(all, 'bulwark') / 100;
  eq.mitigation = Math.min(0.8, mit);
  // Velocidade: afixo Ligeireza (fração), lida pelo movement/playerControl.
  eq.speedMul = 1 + sumMod(all, 'swift') / 100;
}
