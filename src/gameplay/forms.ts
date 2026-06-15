/**
 * Definições das Formas do Druida. Cada forma é praticamente um moveset:
 * troca o ataque básico, a mobilidade e o custo de Seiva por segundo.
 * Ver docs/game-design.md §3.3 e docs/adr/0004-druid-fantasy.md.
 */
export const FORMS = {
  humanoid: {
    name: 'Druida',
    mesh: 'druid',
    basic: 'staff_strike', // na verdade conjura a magia equipada (ver abilities)
    attackCooldown: 0.45,
    speedMul: 1,
    sapPerSec: 0, // forma base não drena
    color: 0x4f8f3f,
  },
  wolf: {
    name: 'Lobo',
    mesh: 'wolf',
    basic: 'wolf_bite',
    attackCooldown: 0.32,
    speedMul: 1.5,
    sapPerSec: 6,
    color: 0x8c8c98,
  },
  bear: {
    name: 'Urso',
    mesh: 'bear',
    basic: 'bear_swipe',
    attackCooldown: 0.7,
    speedMul: 0.8,
    sapPerSec: 7,
    color: 0x6b4a2f,
    damageReduction: 0.35, // tank
  },
  raven: {
    name: 'Corvo',
    mesh: 'raven',
    basic: 'raven_peck',
    attackCooldown: 0.4,
    speedMul: 1.8,
    sapPerSec: 5,
    color: 0x2b2b35,
    flying: true, // atravessa obstáculos baixos
  },
  frog: {
    name: 'Sapo',
    mesh: 'frog',
    basic: 'frog_tongue',
    attackCooldown: 0.55,
    speedMul: 1.1,
    sapPerSec: 5,
    color: 0x5aa64a,
  },
};

export const FORM_ORDER = ['humanoid', 'wolf', 'bear', 'raven', 'frog'];
