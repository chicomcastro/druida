/**
 * Balanceamento centralizado. Reúne os "números mágicos" de progressão,
 * combate, spawn e escala, num só lugar para ajuste fino. Ver
 * docs/adr/0012-balance.md. Ajustar aqui afeta todo o jogo sem caçar
 * constantes pelos sistemas.
 */
export const BALANCE = {
  player: {
    baseHp: 130,
    baseSapRegen: 15,
    sapMax: 100,
    sapStartFrac: 0.5,
    dodgeIFrames: 0.32,
    levelDamageScale: 0.05, // +5% de dano por nível de grupo
  },

  progression: {
    xpBase: 38,
    xpExp: 1.5,
    enchantPointsPerLevel: 1,
  },

  enemy: {
    // Escala com nível de grupo e nº de jogadores (coop).
    hpPerLevel: 0.16,
    hpPlayerBase: 0.7,
    hpPerPlayer: 0.4,
    damagePerLevel: 0.07,
  },

  spawn: {
    capBase: 8,
    capPerLevel: 0.7,
    capPlayerBase: 0.7,
    capPerPlayer: 0.4,
    intervalMax: 1.4,
    intervalMin: 0.45,
    intervalPerLevel: 0.04,
  },

  loot: {
    defaultDropChance: 0.3,
    essenceMin: 1,
    essenceMax: 4,
  },
};
