import { C } from '../core/ecs/components.js';
import { applyDamage, healEntity } from './combat.js';
import { applyEquipment } from './equip.js';

/**
 * Dons dos Santuários (ADR 0050): ao despertar uma Forma Ancestral, o jogador
 * escolhe UM de dois dons permanentes — escolhas que mudam o jeito de jogar,
 * não só números. Guardados em `game.boons` (form -> boonId) e persistidos no
 * save; os efeitos passivos entram no `applyEquipment` (vida/regen) e em
 * multiplicadores lidos nos sistemas (velocidade/i-frames); os reativos
 * (refletir dano, curar ao trocar de forma) são hooks de evento.
 */

export const BOONS = {
  bear: [
    { id: 'casca', name: 'Casca de Carvalho', desc: '+20% de vida máxima', icon: '🛡️' },
    { id: 'espinhos', name: 'Pelagem de Espinhos', desc: 'Reflete 15% do dano recebido de volta ao agressor', icon: '🌵' },
  ],
  raven: [
    { id: 'vento', name: 'Asas do Vento', desc: '+10% de velocidade de movimento', icon: '💨' },
    { id: 'pressagio', name: 'Presságio', desc: 'A esquiva fica invulnerável por 50% mais tempo', icon: '👁️' },
  ],
  frog: [
    { id: 'orvalho', name: 'Orvalho Eterno', desc: '+30% de regeneração de Seiva', icon: '💧' },
    { id: 'pele_umida', name: 'Pele Úmida', desc: 'Cura 10 de vida ao trocar de forma', icon: '🩹' },
  ],
};

export function hasBoon(game, boonId) {
  return Object.values(game.boons ?? {}).includes(boonId);
}

/** Multiplicador de velocidade de movimento (Asas do Vento). */
export function speedBoonMul(game) {
  return hasBoon(game, 'vento') ? 1.1 : 1;
}

/** Multiplicador dos i-frames da esquiva (Presságio). */
export function iframeBoonMul(game) {
  return hasBoon(game, 'pressagio') ? 1.5 : 1;
}

/** Registra a escolha e recalcula os stats derivados de todos os jogadores. */
export function chooseBoon(game, form, boonId) {
  const boon = BOONS[form]?.find((b) => b.id === boonId);
  if (!boon) return false;
  game.boons = game.boons ?? {};
  if (game.boons[form]) return false; // dom do santuário é permanente
  game.boons[form] = boonId;
  for (const [id] of game.world.query(C.PlayerControlled)) applyEquipment(game, id);
  game.emit('boonChosen', { form, boon: boonId });
  game.emit('objective', { text: `✨ Dom recebido: ${boon.name}` });
  return true;
}

/** Efeitos reativos (registrado uma vez pelo Game). */
export function registerBoonHooks(game) {
  game.on('damage', (e) => {
    // Pelagem de Espinhos: jogador ferido reflete parte do dano. O marcador
    // `reflected` impede eco infinito (o dano refletido não reflete de novo).
    if (e.reflected || !e.attackerId || !hasBoon(game, 'espinhos')) return;
    if (!game.world.get(e.id, C.PlayerControlled)) return;
    if (game.world.get(e.attackerId, C.Faction)?.team !== 'enemy') return;
    applyDamage(game, e.attackerId, Math.max(1, e.amount * 0.15), { reflected: true });
  });
  game.on('formSwap', (e) => {
    if (hasBoon(game, 'pele_umida')) healEntity(game, e.id, 10);
  });
}
