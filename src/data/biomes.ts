/** Biomas do mundo aberto: clima, props e tabela de spawn. */
export const BIOMES = {
  clareira: {
    name: 'Clareira Viva', level: 1,
    ground: 0x3e6b3a, background: 0x1a2a1e, fogNear: 40, fogFar: 95,
    propColor: 0x2f5a2c, propDensity: 0.05,
    enemies: [
      { key: 'rotboar', weight: 6 },
      { key: 'shadecrow', weight: 3 },
      { key: 'fungling', weight: 2 },
    ],
  },
  pantano: {
    name: 'Pântano Apodrecido', level: 3,
    ground: 0x40492f, background: 0x161c14, fogNear: 28, fogFar: 70,
    propColor: 0x55502a, propDensity: 0.06,
    enemies: [
      { key: 'rotboar', weight: 4 },
      { key: 'fungling', weight: 4 },
      { key: 'husk', weight: 3 },
      { key: 'shaman', weight: 1 },
    ],
  },
  bosque_cinza: {
    name: 'Bosque Cinza', level: 5,
    ground: 0x4a4036, background: 0x241c18, fogNear: 30, fogFar: 75,
    propColor: 0x35302a, propDensity: 0.07,
    enemies: [
      { key: 'husk', weight: 4 },
      { key: 'shadecrow', weight: 4 },
      { key: 'shaman', weight: 2 },
      { key: 'fungling', weight: 2 },
    ],
  },
  picos: {
    name: 'Picos Gélidos', level: 7,
    ground: 0xb8c6d0, background: 0x223040, fogNear: 26, fogFar: 70,
    propColor: 0x8aa0b0, propDensity: 0.04,
    enemies: [
      { key: 'husk', weight: 4 },
      { key: 'shaman', weight: 3 },
      { key: 'shadecrow', weight: 3 },
    ],
  },
  coracao: {
    name: 'Coração Corrompido', level: 9,
    ground: 0x2a1f2a, background: 0x140d16, fogNear: 22, fogFar: 60,
    propColor: 0x3a2440, propDensity: 0.06,
    boss: 'rotlord',
    enemies: [
      { key: 'husk', weight: 4 },
      { key: 'shaman', weight: 3 },
      { key: 'fungling', weight: 3 },
    ],
  },
};

export const BIOME_ORDER = ['clareira', 'pantano', 'bosque_cinza', 'picos', 'coracao'];
