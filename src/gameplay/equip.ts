import { C } from '../core/ecs/components.js';
import { BALANCE } from '../data/balance.js';

const BASE_HP = BALANCE.player.baseHp;
const BASE_SAP_REGEN = BALANCE.player.baseSapRegen;

/**
 * Recalcula stats derivados do equipamento (vida máx, regen de Seiva,
 * mitigação de dano). Chamado a cada equip/desequip. O poder principal vem do
 * dano da arma e dos artefatos; armadura dá sobrevivência.
 */
export function applyEquipment(game, id) {
  const hp = game.world.get(id, C.Health);
  const sap = game.world.get(id, C.Sap);
  const eq = game.world.get(id, C.Equipment);
  if (!hp || !sap || !eq) return;

  let maxHp = BASE_HP;
  if (eq.armor?.bonus === 'health') maxHp += eq.armor.bonusValue ?? 0;
  const vigor = eq.armor?.enchants?.find((e) => e.id === 'vigor' && e.level > 0);
  if (vigor) maxHp += 30 * vigor.level;
  // Dom Casca de Carvalho (ADR 0050): +20% de vida máxima.
  if (Object.values(game.boons ?? {}).includes('casca')) maxHp = Math.round(maxHp * 1.2);

  const ratio = hp.max > 0 ? hp.hp / hp.max : 1;
  hp.max = maxHp;
  hp.hp = Math.min(maxHp, Math.round(maxHp * ratio));

  let regen = BASE_SAP_REGEN;
  if (eq.armor?.bonus === 'sapRegen') regen += (eq.armor.bonusValue ?? 0) * 0.4;
  // Dom Orvalho Eterno (ADR 0050): +30% de regeneração de Seiva.
  if (Object.values(game.boons ?? {}).includes('orvalho')) regen *= 1.3;
  sap.regen = regen;

  eq.mitigation = eq.armor?.armor ?? 0; // 0..~0.3
}
