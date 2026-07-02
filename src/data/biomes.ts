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
    // Região curada pela campanha: mundo visivelmente mais vivo (ADR 0044).
    purified: {
      ground: 0x4a7d42, background: 0x22382a, fogNear: 46, fogFar: 105,
      propColor: 0x3f7a34, detailColor: 0x6fae4f,
      light: { sun: 0xfff2c8, sunIntensity: 1.35, hemiIntensity: 0.85 },
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
    ground: 0x40492f, background: 0x161c14, fogNear: 38, fogFar: 88,
    propColor: 0x55502a, propDensity: 0.06, detailColor: 0x6b6b32,
    light: { sun: 0xd8e6a8, sunIntensity: 1.1, hemi: 0x9fb884, hemiGround: 0x232c1c, hemiIntensity: 0.8 },
    ambient: { color: 0x9fd06a, size: 0.2, rise: 0.08, sway: 0.35, opacity: 0.6 }, // esporos
    purified: {
      ground: 0x49573a, background: 0x1d2a1c, fogNear: 44, fogFar: 98,
      propColor: 0x5f6b34, detailColor: 0x7d8a42,
      light: { sun: 0xe8f0c0, sunIntensity: 1.2, hemiIntensity: 0.9 },
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
    ground: 0x4a4036, background: 0x241c18, fogNear: 40, fogFar: 92,
    propColor: 0x35302a, propDensity: 0.07, detailColor: 0x565048,
    light: { sun: 0xe8d8c0, sunIntensity: 1.1, hemi: 0x9a9aa2, hemiGround: 0x342c24, hemiIntensity: 0.8 },
    ambient: { color: 0xb0a89a, size: 0.18, rise: -0.25, sway: 0.6, opacity: 0.55 }, // cinza caindo
    purified: {
      ground: 0x51584a, background: 0x2a2c20, fogNear: 46, fogFar: 100,
      propColor: 0x47543a, detailColor: 0x6a7a4a,
      light: { sun: 0xf4e4c8, sunIntensity: 1.2, hemi: 0xa8b0a2, hemiIntensity: 0.9 },
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
    ground: 0xb8c6d0, background: 0x223040, fogNear: 26, fogFar: 70,
    propColor: 0x8aa0b0, propDensity: 0.04, detailColor: 0xd8e4ea,
    light: { sun: 0xeaf4ff, sunIntensity: 1.35, hemi: 0xcfe8ff, hemiGround: 0x5a6a78, hemiIntensity: 0.9 },
    ambient: { color: 0xffffff, size: 0.2, rise: -0.7, sway: 0.9, opacity: 0.85 }, // neve
    purified: {
      ground: 0xc6d4de, background: 0x2c4054, fogNear: 44, fogFar: 100,
      light: { sun: 0xf4faff, sunIntensity: 1.5, hemiIntensity: 1.0 },
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
    ground: 0x2a1f2a, background: 0x140d16, fogNear: 30, fogFar: 72,
    propColor: 0x3a2440, propDensity: 0.06, detailColor: 0x4a2a52,
    light: { sun: 0xc09ac8, sunIntensity: 0.85, hemi: 0x7a5a8a, hemiGround: 0x1c1220, hemiIntensity: 0.65 },
    ambient: { color: 0xff6a9a, size: 0.18, rise: 0.5, sway: 0.4, opacity: 0.7 }, // fagulhas da podridão
    purified: {
      ground: 0x3a5040, background: 0x1c2a20, fogNear: 40, fogFar: 92,
      propColor: 0x3f6a3a, detailColor: 0x5f9a4f,
      light: { sun: 0xd8f0c0, sunIntensity: 1.15, hemi: 0x9ac89a, hemiGround: 0x1c2a1c, hemiIntensity: 0.85 },
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
