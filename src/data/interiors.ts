/**
 * Interiores acessíveis das casas (ADR 0094, E5). Cada porta temática abre uma
 * micro-instância (mesmo pipeline da masmorra) com um NPC responsável e um
 * propósito: lojas especializadas, taverna (descanso + refeição), casa da
 * liderança e salão comunal. Tudo em data para replicar nas outras vilas (E7).
 */

export type InteriorService = 'shop' | 'talk' | 'rest';

export interface InteriorTheme {
  id: string;
  /** Título mostrado ao entrar. */
  name: string;
  /** Nome do NPC residente. */
  npc: string;
  /** Papel/assinatura curta para o prompt da porta. */
  role: string;
  service: InteriorService;
  /** Viés do estoque das lojas (armeiro só vende armas etc.). */
  shopBias?: 'weapon' | 'armor' | null;
  /** Família à qual o NPC pertence (rixa — ADR 0095). */
  family?: string;
  /** Fragmento do codex revelado ao conversar (uma vez). */
  loreId?: string;
  floor: number;
  wall: number;
  accent: number;
  /** Túnica do NPC (modelo voxel). */
  robe: number;
  trim: number;
  /** Fala de saudação (lojas) ou diálogo completo (talk). */
  lines: string[];
}

/**
 * Refeição da taverna (ADR 0094): comer concede um bônus temporário de dano
 * ("bem alimentado") e descansar cura o grupo e passa a noite. Números em data
 * para tunar no Gate D/E9.
 */
export const TAVERN = {
  mealDmg: 0.12,     // +12% de dano
  mealDuration: 120, // segundos
  restHeal: 1,       // fração da vida máxima curada ao descansar (cheio)
};

export const INTERIOR_THEMES: Record<string, InteriorTheme> = {
  weapons: {
    id: 'weapons', name: '⚔️ Forja do Armeiro', npc: 'Brida Fenwick', role: 'armeiro',
    service: 'shop', shopBias: 'weapon', family: 'fenwick', loreId: 'l13',
    floor: 0x3a2b22, wall: 0x4a3628, accent: 0xff8a3a, robe: 0x8a5a3a, trim: 0x3a2d22,
    lines: [
      'O aço canta quando bem forjado. Escolha o seu.',
      'Só não repare na fumaça — os Aldren dizem que ela mata o trigo. Trigo fraco não é culpa da minha forja.',
    ],
  },
  armor: {
    id: 'armor', name: '🛡️ Armaduraria', npc: 'Orin Aldren', role: 'armaduraria',
    service: 'shop', shopBias: 'armor', family: 'aldren', loreId: 'l14',
    floor: 0x2c3038, wall: 0x3a404a, accent: 0x6aa0ff, robe: 0x5a6e86, trim: 0xd8e4ea,
    lines: [
      'Couro curtido, placas batidas. Nada te fura aqui.',
      'Curto o couro no riacho — quando os Fenwick deixam sobrar água. Mas… entre nós, ando achando que o problema não é a forja deles.',
    ],
  },
  tavern: {
    id: 'tavern', name: '🍲 Taverna do Carvalho', npc: 'Vesna, a Taverneira', role: 'taverna',
    service: 'rest',
    floor: 0x3a2c1e, wall: 0x5a4230, accent: 0xffb46a, robe: 0xb8863f, trim: 0x5a4633,
    lines: ['Senta, viajante. Um caldo quente e uma cama fazem milagres.'],
  },
  leader: {
    id: 'leader', name: '🏛️ Casa da Liderança', npc: 'Anciã Maroa', role: 'liderança',
    service: 'talk', loreId: 'l15',
    floor: 0x2e3a28, wall: 0x3f5236, accent: 0x9fe06a, robe: 0x3f7a58, trim: 0x6b4a2f,
    lines: [
      'Bem-vindo à Clareira, druida. Eu falo pelos que ficaram.',
      'Duas famílias sustentam esta vila: os Fenwick da forja e os Aldren dos campos.',
      'A rixa deles é antiga — e piora enquanto a corrupção avança. Talvez você possa ajudar.',
    ],
  },
  hall: {
    id: 'hall', name: '🔥 Salão Comunal', npc: 'Tovar, o Cronista', role: 'salão comunal',
    service: 'talk', loreId: 'l14',
    floor: 0x342a1e, wall: 0x4a3a28, accent: 0xffd27a, robe: 0x6b4a2f, trim: 0x8a6b3a,
    lines: [
      'Aqui a vila se reúne — e discute. Sente-se junto ao fogo.',
      'Os Fenwick dizem que os Aldren desviam água do moinho. Os Aldren dizem que a forja envenena o riacho.',
      'Registro tudo no códice. A verdade costuma estar no meio.',
    ],
  },
  home: {
    id: 'home', name: '🏠 Moradia', npc: 'Morador', role: 'moradia',
    service: 'talk',
    floor: 0x3a2e22, wall: 0x5a4632, accent: 0xffd890, robe: 0x5a8f5f, trim: 0x6b4a2f,
    lines: ['Uma casa simples, mas quente. Fique à vontade.'],
  },
};

/** Devolve o tema (ou a moradia genérica como fallback). */
export function interiorTheme(id: string): InteriorTheme {
  return INTERIOR_THEMES[id] ?? INTERIOR_THEMES.home;
}
