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
  /** Estação de cozinha (caldeirão + interativo 'kitchen') dentro da sala. */
  kitchen?: boolean;
  /** Viés do estoque das lojas (armeiro só vende armas etc.). */
  shopBias?: 'weapon' | 'armor' | null;
  /** Categoria de estoque especializada (E21): 'food' cozinheiro, 'garden' jardineiro. */
  shopKind?: 'food' | 'garden' | null;
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
    service: 'rest', kitchen: true,
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
    service: 'talk', kitchen: true, loreId: 'l14',
    floor: 0x342a1e, wall: 0x4a3a28, accent: 0xffd27a, robe: 0x6b4a2f, trim: 0x8a6b3a,
    lines: [
      'Aqui a vila se reúne — e discute. Sente-se junto ao fogo.',
      'Os Fenwick dizem que os Aldren desviam água do moinho. Os Aldren dizem que a forja envenena o riacho.',
      'Registro tudo no códice. A verdade costuma estar no meio.',
    ],
  },
  market: {
    id: 'market', name: '🏪 Mercado Geral', npc: 'Mercador', role: 'mercado',
    service: 'shop', shopBias: null,
    floor: 0x3a3226, wall: 0x4a4030, accent: 0xffd27a, robe: 0xb8863f, trim: 0x5a4633,
    lines: ['Tudo que a estrada pede, tenho aqui. Dê uma olhada.'],
  },
  garden: {
    id: 'garden', name: '🌱 Casa do Jardineiro', npc: 'Fiora, a Jardineira', role: 'jardineiro',
    service: 'shop', shopBias: null, shopKind: 'garden',
    floor: 0x2e3a24, wall: 0x3f4a30, accent: 0x9fe06a, robe: 0x5a8f3f, trim: 0xcfe0a0,
    lines: [
      'Semente boa vira horta cheia. Leve das minhas.',
      'Erva, cenoura, cogumelo — planta no canteiro e volta pra colher.',
    ],
  },
  home: {
    id: 'home', name: '🏠 Moradia', npc: 'Morador', role: 'moradia',
    service: 'talk',
    floor: 0x3a2e22, wall: 0x5a4632, accent: 0xffd890, robe: 0x5a8f5f, trim: 0x6b4a2f,
    lines: ['Uma casa simples, mas quente. Fique à vontade.'],
  },

  // --- Vau das Palafitas: rixa da água escura (ADR 0107) -------------------
  vau_arpo: {
    id: 'vau_arpo', name: '🔱 Casa dos Arpões', npc: 'Nereu Vison', role: 'arpoeiro',
    service: 'shop', shopBias: 'weapon', family: 'vison', loreId: 'l16',
    floor: 0x25323a, wall: 0x33454f, accent: 0x5a86a8, robe: 0x3f6a86, trim: 0xbfe0ea,
    lines: [
      'Arpão bom fura casca oca de primeira. Escolha o seu.',
      'Se o peixe sumiu, pergunte aos Caniço e os filtros deles. Eu só afio o ferro.',
    ],
  },
  vau_couro: {
    id: 'vau_couro', name: '🥽 Curtume do Junco', npc: 'Ália Caniço', role: 'curtidora',
    service: 'shop', shopBias: 'armor', family: 'canico', loreId: 'l17',
    floor: 0x2b3324, wall: 0x3c452f, accent: 0x7a8a3a, robe: 0x5a6e3a, trim: 0xd8e0a8,
    lines: [
      'Couro curtido na seiva filtrada — nada te fura aqui.',
      'A água anda turva… os Vison remexem o lodo, dizem. Mas, entre nós, ando achando que o problema vem de mais fundo.',
    ],
  },

  // --- Cinzafolha: cortar × queimar (ADR 0107) -----------------------------
  cinza_serra: {
    id: 'cinza_serra', name: '🪓 Serraria do Cerne', npc: 'Torvald Cerne', role: 'serrador',
    service: 'shop', shopBias: 'weapon', family: 'cerne', loreId: 'l18',
    floor: 0x2e2418, wall: 0x3f3122, accent: 0x8a5a2a, robe: 0x6b4a2f, trim: 0xc89a5a,
    lines: [
      'Machado que canta limpo corta qualquer tronco — corrompido ou não.',
      'Os Brasa queimam tora boa por preguiça de separar. Eu corto o que dá pra salvar.',
    ],
  },
  cinza_forno: {
    id: 'cinza_forno', name: '🔥 Forno da Brasa', npc: 'Móra Brasa', role: 'carvoeira',
    service: 'shop', shopBias: 'armor', family: 'brasa', loreId: 'l19',
    floor: 0x2a2018, wall: 0x3a2a20, accent: 0xd06a2a, robe: 0x8a4a28, trim: 0xffb46a,
    lines: [
      'Placas endurecidas no forno, couro tratado na cinza. Nada apodrece em quem veste isto.',
      'Os Cerne serram devagar demais… mas talvez a gente esteja brigando pela razão errada.',
    ],
  },

  // --- Abrigo do Degelo: a trilha × o rebanho (ADR 0107) -------------------
  degelo_trilha: {
    id: 'degelo_trilha', name: '⛏️ Casa da Trilha', npc: 'Kível Cairn', role: 'guia',
    service: 'shop', shopBias: 'weapon', family: 'cairn', loreId: 'l20',
    floor: 0x28323a, wall: 0x37454f, accent: 0x8fb8d8, robe: 0x4a6e86, trim: 0xdff0ff,
    lines: [
      'Piquete de gelo e lança de osso — o que a encosta exige.',
      'O rebanho dos Velo derruba meus cairns. Sem marcos, a trilha ao Coração se perde.',
    ],
  },
  degelo_pasto: {
    id: 'degelo_pasto', name: '🐐 Redil do Velo', npc: 'Sarna Velo', role: 'pastora',
    service: 'shop', shopBias: 'armor', family: 'velo', loreId: 'l21',
    floor: 0x33302a, wall: 0x45423a, accent: 0xcabf9a, robe: 0x8a7a5a, trim: 0xefe6cf,
    lines: [
      'Pele e lã batida contra o vento gelado. Aquece e protege.',
      'Os Cairn fecham o melhor pasto por umas pedras… mas o rebanho anda fugindo por conta própria. Não sei mais o que pensar.',
    ],
  },
};

/** Devolve o tema (ou a moradia genérica como fallback). */
export function interiorTheme(id: string): InteriorTheme {
  return INTERIOR_THEMES[id] ?? INTERIOR_THEMES.home;
}
