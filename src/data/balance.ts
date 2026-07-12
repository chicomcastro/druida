/**
 * Balanceamento centralizado. Reúne os "números mágicos" de progressão,
 * combate, spawn e escala, num só lugar para ajuste fino. Ver
 * docs/adr/0012-balance.md. Ajustar aqui afeta todo o jogo sem caçar
 * constantes pelos sistemas.
 */
export const BALANCE = {
  player: {
    baseHp: 118, // E42: leve corte (130→118) p/ o combate custar algo (ADR 0175)
    baseSapRegen: 15,
    sapMax: 100,
    sapStartFrac: 0.5,
    dodgeIFrames: 0.32,
    levelDamageScale: 0.05, // +5% de dano por nível de grupo
  },

  progression: {
    // E57: L1→L2 custava só 38 XP (~6 comuns), então a PRIMEIRA refrega despejava
    // 3–4 níveis de uma vez ("subo de nível toda vez que ataco, até uns 4, aí
    // para" — a curva alcançava os comuns e estagnava). xpBase 38→64 encarece os
    // primeiros níveis para serem conquistados, sem tocar no poder (nível só dá
    // ponto de encanto/talento — poder vem do gear; ADR 0175/0182).
    xpBase: 64,
    xpExp: 1.5,
    enchantPointsPerLevel: 1,
  },

  enemy: {
    // Escala com nível de grupo e nº de jogadores (coop). As curvas POR NÍVEL
    // foram suavizadas (E45, ADR 0177): a 0.16/0.07 os inimigos cresciam mais
    // rápido que o poder de equipamento do jogador no meio do jogo (L10–15), e
    // um trio virava quase invencível pro piso (melee sem esquiva/sem armadura).
    // 0.12/0.05 achata esse vale mantendo o L1 idêntico (o termo por nível é 0
    // no L1) e o endgame ainda ameaçador. Ver docs/balance-report.md.
    hpPerLevel: 0.12,
    hpPlayerBase: 0.7,
    hpPerPlayer: 0.4,
    damagePerLevel: 0.05,
    // Fatores globais de dificuldade (E42, ADR 0175): calibrados com o simulador
    // (bot melee-sem-esquiva como PISO). Antes 1 comum era trivial (~90% de vida)
    // e 3 juntos só "médio"; agora 1 comum dá trabalho (fácil/médio, ~78%) e 3
    // juntos ficam difícil/brutal (~26%). Os inimigos mais duros (Casca Oca,
    // Xamã, Espectro) em grupo passam a ameaçar de verdade.
    hpBase: 1.4,
    damageBase: 1.9,
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

  dayNight: {
    // Ciclo dia/noite + clima (ADR 0049).
    cycleSeconds: 420, // ciclo completo (~7 min)
    nightFraction: 0.35,
    nightSpawnBonus: 0.25, // +25% de cap de inimigos à noite
    weatherChance: 0.55,
    weatherCalmMin: 45,
    weatherCalmMax: 100,
    weatherDurMin: 22,
    weatherDurMax: 45,
  },

  encounters: {
    // Packs compostos e elites com afixo (ADR 0045).
    packChance: 0.22,
    eliteChanceBase: 0.02, // Clareira: raro (jogador novo)
    eliteChancePerRing: 0.035, // cresce por anel de bioma
  },
};
