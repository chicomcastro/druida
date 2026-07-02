/**
 * Biomas do mundo aberto: clima, iluminação, props, ambiente e tabela de spawn.
 * `light` alimenta o Renderer (sol/hemisfério por região) e `ambient` as
 * partículas atmosféricas (vagalumes/esporos/cinzas/neve/brasas) — ver
 * docs/adr/0042-atmosfera-visual.md.
 */
export const BIOMES = {
  clareira: {
    name: 'Clareira Viva', level: 1,
    ground: 0x3e6b3a, background: 0x1a2a1e, fogNear: 40, fogFar: 95,
    propColor: 0x2f5a2c, propDensity: 0.05, detailColor: 0x5a8f3f,
    light: { sun: 0xffedbe, sunIntensity: 1.25, hemi: 0xa8d8ff, hemiGround: 0x2e4426, hemiIntensity: 0.75 },
    ambient: { color: 0xd8ffa0, size: 0.16, rise: 0.15, sway: 0.5, opacity: 0.8 }, // vagalumes
    // Clareira inicial: combate corpo-a-corpo (sem inimigos ranged). Ver ADR 0035.
    enemies: [
      { key: 'rotboar', weight: 7 },
      { key: 'fungling', weight: 3 },
    ],
  },
  pantano: {
    name: 'Pântano Apodrecido', level: 3,
    ground: 0x40492f, background: 0x161c14, fogNear: 38, fogFar: 88,
    propColor: 0x55502a, propDensity: 0.06, detailColor: 0x6b6b32,
    light: { sun: 0xd8e6a8, sunIntensity: 1.1, hemi: 0x9fb884, hemiGround: 0x232c1c, hemiIntensity: 0.8 },
    ambient: { color: 0x9fd06a, size: 0.2, rise: 0.08, sway: 0.35, opacity: 0.6 }, // esporos
    // Introduz ranged aos poucos (corvo-sombra/xamã) em região mais avançada.
    enemies: [
      { key: 'rotboar', weight: 4 },
      { key: 'fungling', weight: 4 },
      { key: 'husk', weight: 3 },
      { key: 'shadecrow', weight: 2 },
      { key: 'shaman', weight: 1 },
    ],
  },
  bosque_cinza: {
    name: 'Bosque Cinza', level: 5,
    ground: 0x4a4036, background: 0x241c18, fogNear: 40, fogFar: 92,
    propColor: 0x35302a, propDensity: 0.07, detailColor: 0x565048,
    light: { sun: 0xe8d8c0, sunIntensity: 1.1, hemi: 0x9a9aa2, hemiGround: 0x342c24, hemiIntensity: 0.8 },
    ambient: { color: 0xb0a89a, size: 0.18, rise: -0.25, sway: 0.6, opacity: 0.55 }, // cinza caindo
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
    propColor: 0x8aa0b0, propDensity: 0.04, detailColor: 0xd8e4ea,
    light: { sun: 0xeaf4ff, sunIntensity: 1.35, hemi: 0xcfe8ff, hemiGround: 0x5a6a78, hemiIntensity: 0.9 },
    ambient: { color: 0xffffff, size: 0.2, rise: -0.7, sway: 0.9, opacity: 0.85 }, // neve
    enemies: [
      { key: 'husk', weight: 4 },
      { key: 'shaman', weight: 3 },
      { key: 'shadecrow', weight: 3 },
    ],
  },
  coracao: {
    name: 'Coração Corrompido', level: 9,
    ground: 0x2a1f2a, background: 0x140d16, fogNear: 30, fogFar: 72,
    propColor: 0x3a2440, propDensity: 0.06, detailColor: 0x4a2a52,
    light: { sun: 0xc09ac8, sunIntensity: 0.85, hemi: 0x7a5a8a, hemiGround: 0x1c1220, hemiIntensity: 0.65 },
    ambient: { color: 0xff6a9a, size: 0.18, rise: 0.5, sway: 0.4, opacity: 0.7 }, // fagulhas da podridão
    boss: 'rotlord',
    enemies: [
      { key: 'husk', weight: 4 },
      { key: 'shaman', weight: 3 },
      { key: 'fungling', weight: 3 },
    ],
  },
};

export const BIOME_ORDER = ['clareira', 'pantano', 'bosque_cinza', 'picos', 'coracao'];
