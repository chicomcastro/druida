/** Catálogo de inimigos (data-driven). Ver docs/adr/0007-content-data.md. */
export const ENEMIES = {
  rotboar: {
    name: 'Javali Apodrecido', mesh: 'rotboar', behavior: 'melee',
    hp: 34, speed: 3.4, damage: 9, radius: 0.55, aggroRange: 16, attackRange: 1.5,
    attackCooldown: 1.3, xp: 6, loot: { dropChance: 0.22 },
  },
  shadecrow: {
    name: 'Corvo-Sombra', mesh: 'shadecrow', behavior: 'ranged',
    hp: 18, speed: 3.0, damage: 7, radius: 0.4, aggroRange: 17, attackRange: 9,
    attackCooldown: 1.8, projectileColor: 0x6a3a7a, xp: 7, loot: { dropChance: 0.24 },
  },
  fungling: {
    name: 'Fungo Explosivo', mesh: 'fungling', behavior: 'exploder',
    hp: 14, speed: 4.2, damage: 16, radius: 0.45, aggroRange: 18, attackRange: 1.3,
    attackCooldown: 0.1, xp: 5, loot: { dropChance: 0.18 },
  },
  husk: {
    name: 'Casca Oca', mesh: 'husk', behavior: 'melee',
    hp: 70, speed: 2.2, damage: 14, radius: 0.6, scale: 1.15, aggroRange: 15, attackRange: 1.7,
    attackCooldown: 1.7, xp: 12, loot: { dropChance: 0.34 },
  },
  shaman: {
    name: 'Xamã Corrompido', mesh: 'shaman', behavior: 'summoner',
    hp: 55, speed: 2.6, damage: 6, radius: 0.5, aggroRange: 18, attackRange: 10,
    attackCooldown: 4.5, summon: 'rotboar', xp: 18, loot: { dropChance: 0.5 },
  },
  // Novos inimigos (ADR 0100, E8.3): golpe corpo-a-corpo que aplica status.
  bogbrute: {
    name: 'Atoladiço', mesh: 'bogbrute', behavior: 'melee',
    hp: 60, speed: 2.3, damage: 12, radius: 0.6, scale: 1.1, aggroRange: 15, attackRange: 1.7,
    attackCooldown: 1.8, onHit: { poison: 2.5 }, xp: 14, loot: { dropChance: 0.34 },
  },
  ashwraith: {
    name: 'Espectro de Cinza', mesh: 'ashwraith', behavior: 'melee',
    hp: 40, speed: 3.2, damage: 10, radius: 0.5, aggroRange: 17, attackRange: 1.5,
    attackCooldown: 1.4, onHit: { stun: 0.5 }, xp: 15, loot: { dropChance: 0.34 },
  },
  frostfang: {
    name: 'Presa-Gélida', mesh: 'frostfang', behavior: 'melee',
    hp: 48, speed: 3.6, damage: 13, radius: 0.55, aggroRange: 16, attackRange: 1.6,
    attackCooldown: 1.5, onHit: { freeze: 0.9 }, xp: 16, loot: { dropChance: 0.36 },
  },
};

/**
 * Afixos de elite: inimigos comuns promovidos com um modificador que muda o
 * combate (não só números) e recompensa maior. Ver ADR 0045.
 */
export const ELITE_AFFIXES = {
  veloz: { name: 'Veloz', color: 0x6ad0ff, mods: { speed: 1.5, hp: 1.2 } },
  petreo: { name: 'Pétreo', color: 0xb8b8c8, mods: { speed: 0.85, hp: 2.2 } },
  volatil: { name: 'Volátil', color: 0xff8a3a, mods: { hp: 1.3 }, explode: { damage: 18, radius: 3.2 } },
  sanguessuga: { name: 'Sanguessuga', color: 0xff5a8a, mods: { hp: 1.5 }, leech: 0.5 },
};

/** Chefe da campanha — fases em escala. */
export const BOSSES = {
  rotlord: {
    name: 'O Apodrecedor', mesh: 'rotlord', behavior: 'melee', boss: true,
    hp: 900, speed: 2.4, damage: 22, radius: 1.6, scale: 1.0,
    aggroRange: 40, attackRange: 3.0, attackCooldown: 1.6, xp: 300,
    loot: { dropChance: 1 },
  },
  // Chefes de bioma (ADR 0101, E8.4): fases/slam via bossSystem.
  mirelord: {
    name: 'Senhor do Lodo', mesh: 'mirelord', behavior: 'summoner', boss: true,
    hp: 700, speed: 1.8, damage: 18, radius: 1.5, scale: 1.7,
    aggroRange: 34, attackRange: 2.6, attackCooldown: 2.2, summon: 'bogbrute', xp: 220,
    loot: { dropChance: 1 },
  },
  frostreaver: {
    name: 'Ceifador Gélido', mesh: 'frostreaver', behavior: 'melee', boss: true,
    hp: 760, speed: 2.6, damage: 20, radius: 1.4, scale: 1.6,
    aggroRange: 36, attackRange: 2.4, attackCooldown: 1.6, onHit: { freeze: 1.0 }, xp: 240,
    loot: { dropChance: 1 },
  },
};
