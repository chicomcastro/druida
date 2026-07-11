/**
 * Ermos (E37): pontos isolados fora das vilas que enriquecem o mundo — cenários
 * únicos (torre rachada, cemitério, pedras eretas, estátua caída, marco de
 * romaria) e, em alguns, um EREMITA vivendo ali com sua rotina. Certos eremitas
 * oferecem uma **caçada** (bounty exploratória): expurgar N criaturas do ermo em
 * troca de uma recompensa ÚNICA (arma/armadura/artefato lendário nomeado).
 *
 * Só dados aqui (puros/testáveis); o `LandmarkManager` gera os spots no mapa,
 * constrói o cenário voxel, dá vida ao eremita e cuida da caçada.
 */

export type Scenery = 'tower' | 'cemetery' | 'stones' | 'statue' | 'wayshrine';

export interface Bounty {
  /** Verbo da caçada (só sabor no texto). */
  verb: string;
  /** Quantas criaturas do ermo abater. */
  count: number;
  /** Recompensa única: item forçado (raridade 'unique') + nome próprio. */
  reward: { type: 'weapon' | 'armor' | 'artifact'; name: string; essence: number };
}

export interface LandmarkType {
  id: string;
  scenery: Scenery;
  title: string;
  /** Placa/inscrição lida ao chegar perto (sabor de mundo). */
  sign: string;
  hermit?: { name: string; lines: string[] };
  bounty?: Bounty;
}

export const LANDMARK_TYPES: LandmarkType[] = [
  {
    id: 'torre', scenery: 'tower', title: 'Torre Rachada',
    sign: '“Aqui a Ordem vigiava a mata. Já não vigia ninguém.”',
    hermit: {
      name: 'Vígil, o Último Guarda',
      lines: [
        'Vígil: Subi essa torre por trinta invernos. Agora só as corujas sobem.',
        'Vígil: Se limpares o ermo de umas quantas dessas coisas, tenho algo de quando eu ainda servia.',
      ],
    },
    bounty: { verb: 'expurgar', count: 6, reward: { type: 'weapon', name: 'Lâmina do Vígia', essence: 30 } },
  },
  {
    id: 'cemiterio', scenery: 'cemetery', title: 'Cemitério Esquecido',
    sign: '“Descansai. Ainda vos lembramos — mesmo sem nome na pedra.”',
    hermit: {
      name: 'Mílvia, a Coveira',
      lines: [
        'Mílvia: Cavo covas pra quem ninguém chora. É trabalho honesto.',
        'Mílvia: A podridão não deixa os meus mortos em paz. Silencia umas quantas e a mortalha da casa é tua.',
      ],
    },
    bounty: { verb: 'aplacar', count: 8, reward: { type: 'armor', name: 'Mortalha da Coveira', essence: 30 } },
  },
  {
    id: 'estatua', scenery: 'statue', title: 'Estátua Caída',
    sign: '“Um herói cujo nome o vento levou. A pose, o vento não levou.”',
    hermit: {
      name: 'Andarilho Sem-nome',
      lines: [
        'Andarilho: Eu me sento aos pés de heróis esquecidos. Faz companhia.',
        'Andarilho: Vinga o velho de pedra — abate o que rasteja por aqui — e o selo dele é teu.',
      ],
    },
    bounty: { verb: 'vingar', count: 5, reward: { type: 'artifact', name: 'Selo do Caído', essence: 35 } },
  },
  {
    id: 'pedras', scenery: 'stones', title: 'Pedras Eretas',
    sign: '“Contam os dias em silêncio. Ninguém lembra quem as pôs de pé.”',
  },
  {
    id: 'romaria', scenery: 'wayshrine', title: 'Marco da Romaria',
    sign: '“Peregrino: bebe da fonte, acende a lanterna e segue. O Coração espera.”',
  },
];
