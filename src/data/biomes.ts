/**
 * Biomas do mundo aberto: clima, iluminação, props, ambiente e tabela de spawn.
 * `light` alimenta o Renderer (sol/hemisfério por região) e `ambient` as
 * partículas atmosféricas (vagalumes/esporos/cinzas/neve/brasas) — ver
 * docs/adr/0042-atmosfera-visual.md.
 */
export const BIOMES = {
  clareira: {
    name: 'Clareira Viva', level: 1,
    ground: 0x6da052, groundTex: 'grass', background: 0x9cc48e, fogNear: 48, fogFar: 120,
    propColor: 0x3f7a38, propDensity: 0.05, detailColor: 0x7ab84f,
    light: { sun: 0xfff1c4, sunIntensity: 1.8, hemi: 0xbfe0ff, hemiGround: 0x3c5a30, hemiIntensity: 0.5 },
    ambient: { color: 0xd8ffa0, size: 0.16, rise: 0.15, sway: 0.5, opacity: 0.8 }, // vagalumes
    // Região curada pela campanha: mundo visivelmente mais vivo (ADR 0044).
    purified: {
      ground: 0x7cb35c, background: 0xaed49c, fogNear: 54, fogFar: 132,
      propColor: 0x4c9440, detailColor: 0x8fd05f,
      light: { sun: 0xfff6d2, sunIntensity: 1.95, hemiIntensity: 0.55 },
      ambient: { color: 0xe8ffb0, opacity: 0.95, rise: 0.22 },
    },
    // Clareira inicial: combate corpo-a-corpo (sem inimigos ranged). Ver ADR 0035.
    enemies: [
      { key: 'rotboar', weight: 7 },
      { key: 'fungling', weight: 3 },
    ],
    // Encontros compostos (packs): composição autoral por bioma (ADR 0045).
    packs: [
      { weight: 3, comp: ['rotboar', 'rotboar', 'rotboar'] }, // vara de javalis
      { weight: 1, comp: ['fungling', 'fungling', 'rotboar'] },
    ],
  },
  pantano: {
    name: 'Pântano Apodrecido', level: 3,
    ground: 0x6b7a46, groundTex: 'grass', background: 0x8a996e, fogNear: 42, fogFar: 106,
    propColor: 0x6b6534, propDensity: 0.06, detailColor: 0x8a8a44,
    light: { sun: 0xeaf2b6, sunIntensity: 1.62, hemi: 0xa8c090, hemiGround: 0x2c381f, hemiIntensity: 0.52 },
    ambient: { color: 0x9fd06a, size: 0.2, rise: 0.08, sway: 0.35, opacity: 0.6 }, // esporos
    purified: {
      ground: 0x7c9052, background: 0x9cab7c, fogNear: 48, fogFar: 118,
      propColor: 0x8a9c4c, detailColor: 0xaac05f,
      light: { sun: 0xf2f8cc, sunIntensity: 1.75, hemiIntensity: 0.58 },
      ambient: { color: 0xb8f0a0, opacity: 0.85, rise: 0.18, sway: 0.5 }, // vagalumes do brejo
    },
    // Introduz ranged aos poucos (corvo-sombra/xamã) em região mais avançada.
    enemies: [
      { key: 'rotboar', weight: 4 },
      { key: 'fungling', weight: 4 },
      { key: 'husk', weight: 3 },
      { key: 'shadecrow', weight: 2 },
      { key: 'shaman', weight: 1 },
    ],
    packs: [
      { weight: 3, comp: ['shaman', 'husk', 'husk'] }, // xamã escoltado
      { weight: 2, comp: ['fungling', 'fungling', 'fungling'] }, // ninho explosivo
      { weight: 2, comp: ['rotboar', 'rotboar', 'shadecrow'] },
    ],
  },
  bosque_cinza: {
    name: 'Bosque Cinza', level: 5,
    ground: 0x8d8071, groundTex: 'dirt', background: 0x9e968a, fogNear: 44, fogFar: 108,
    propColor: 0x4c463e, propDensity: 0.07, detailColor: 0x7a7266,
    light: { sun: 0xf4e2c8, sunIntensity: 1.58, hemi: 0xb0b0b8, hemiGround: 0x453c32, hemiIntensity: 0.52 },
    ambient: { color: 0xb0a89a, size: 0.18, rise: -0.25, sway: 0.6, opacity: 0.55 }, // cinza caindo
    purified: {
      ground: 0x97a479, background: 0xacb494, fogNear: 50, fogFar: 122,
      propColor: 0x627450, detailColor: 0x92a865,
      light: { sun: 0xf8ecd2, sunIntensity: 1.72, hemi: 0xb8c0b2, hemiIntensity: 0.58 },
      ambient: { color: 0xc8e8a0, opacity: 0.75, rise: 0.12, sway: 0.5 }, // folhas novas
    },
    enemies: [
      { key: 'husk', weight: 4 },
      { key: 'shadecrow', weight: 4 },
      { key: 'shaman', weight: 2 },
      { key: 'fungling', weight: 2 },
    ],
    packs: [
      { weight: 3, comp: ['shadecrow', 'shadecrow', 'husk'] }, // revoada com âncora
      { weight: 2, comp: ['shaman', 'shadecrow', 'shadecrow'] },
      { weight: 2, comp: ['husk', 'husk', 'fungling'] },
    ],
  },
  picos: {
    name: 'Picos Gélidos', level: 7,
    ground: 0xc8d6e0, groundTex: 'snow', background: 0xa8bccc, fogNear: 30, fogFar: 82,
    propColor: 0x8aa0b0, propDensity: 0.04, detailColor: 0xe2eef4,
    light: { sun: 0xfff8e8, sunIntensity: 1.75, hemi: 0xcfe8ff, hemiGround: 0x5a6a78, hemiIntensity: 0.6 },
    ambient: { color: 0xffffff, size: 0.2, rise: -0.7, sway: 0.9, opacity: 0.85 }, // neve
    purified: {
      ground: 0xd4e2ea, background: 0xbcd0de, fogNear: 48, fogFar: 112,
      light: { sun: 0xfffaf0, sunIntensity: 1.9, hemiIntensity: 0.65 },
      ambient: { color: 0xd8f0ff, size: 0.16, rise: -0.35, opacity: 0.9 }, // cintilar de gelo limpo
    },
    enemies: [
      { key: 'husk', weight: 4 },
      { key: 'shaman', weight: 3 },
      { key: 'shadecrow', weight: 3 },
    ],
    packs: [
      { weight: 3, comp: ['husk', 'husk', 'shaman'] }, // patrulha da nevasca
      { weight: 2, comp: ['shadecrow', 'shadecrow', 'shadecrow', 'shaman'] },
    ],
  },
  coracao: {
    name: 'Coração Corrompido', level: 9,
    ground: 0x5a4660, groundTex: 'stone', background: 0x4c3a56, fogNear: 34, fogFar: 86,
    propColor: 0x523460, propDensity: 0.06, detailColor: 0x644070,
    light: { sun: 0xdebae6, sunIntensity: 1.45, hemi: 0x8a6a9a, hemiGround: 0x241a2a, hemiIntensity: 0.5 },
    ambient: { color: 0xff6a9a, size: 0.18, rise: 0.5, sway: 0.4, opacity: 0.7 }, // fagulhas da podridão
    purified: {
      ground: 0x5f8a54, groundTex: 'grass', background: 0x83a878, fogNear: 44, fogFar: 104,
      propColor: 0x4c8442, detailColor: 0x7ab85f,
      light: { sun: 0xe8f8d0, sunIntensity: 1.65, hemi: 0xa8d0a8, hemiGround: 0x243424, hemiIntensity: 0.55 },
      ambient: { color: 0xb8ffb0, opacity: 0.9, rise: 0.25 }, // a semente renasce
    },
    boss: 'rotlord',
    enemies: [
      { key: 'husk', weight: 4 },
      { key: 'shaman', weight: 3 },
      { key: 'fungling', weight: 3 },
    ],
    packs: [
      { weight: 3, comp: ['shaman', 'shaman', 'husk', 'husk'] }, // conclave podre
      { weight: 2, comp: ['fungling', 'fungling', 'fungling', 'husk'] },
    ],
  },
};

export const BIOME_ORDER = ['clareira', 'pantano', 'bosque_cinza', 'picos', 'coracao'];
