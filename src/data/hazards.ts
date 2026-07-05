/**
 * Perigos ambientais do mundo aberto por bioma (ADR 0099, E8.2). Fora das
 * vilas, o próprio terreno ataca de tempos em tempos: telegrafado com um anel
 * na cor do bioma, atinge quem ficar na área (dano + status). Recompensa
 * leitura e movimentação — como nas masmorras (ADR 0048), mas mais espaçado.
 * Data-driven para tunar no Gate E.
 */
export interface OverworldHazard {
  interval: number;   // s entre disparos
  telegraph: number;  // s de aviso antes do golpe
  radius: number;
  damage: number;
  effect: Record<string, number>; // status aplicado (root/burn/freeze/stun/poison)
  color: number;
  label: string;
}

export const OVERWORLD_HAZARDS: Record<string, OverworldHazard | null> = {
  clareira: null, // região inicial: sem perigos ambientais
  pantano: { interval: 9, telegraph: 1.1, radius: 3.0, damage: 5, effect: { root: 1.4 }, color: 0x6fd04a, label: '🫧 O lodo prende os pés!' },
  bosque_cinza: { interval: 8.5, telegraph: 1.0, radius: 3.2, damage: 6, effect: { stun: 0.6 }, color: 0x9a9088, label: '🌫️ Uma nuvem de cinza cega!' },
  picos: { interval: 8, telegraph: 1.1, radius: 3.4, damage: 6, effect: { freeze: 1.0 }, color: 0x9fdcff, label: '❄️ O gelo trai o passo!' },
  coracao: { interval: 6.5, telegraph: 0.9, radius: 3.2, damage: 11, effect: { burn: 1.5 }, color: 0xa64ad0, label: '🩸 A carne do chão pulsa!' },
};
