/**
 * Rotina dos moradores (E22 — Vila viva). Em vez de só perambular ao acaso, cada
 * aldeão segue uma rotina que gira em torno da CASA e do SALÃO COMUNAL, guiada
 * pela hora do dia (`game.dayNight.time` ∈ [0,1), 0 = amanhecer):
 *
 *  - manhã/tarde: cada um cuida do seu (trabalho, passeio, casa) conforme o
 *    arquétipo — e a hora de sair varia de um dia pro outro (vila orgânica);
 *  - almoço: parte come em casa, parte no salão comunal;
 *  - entardecer: TODOS se reúnem no salão comunal para a comunhão (menos os
 *    notívagos);
 *  - noite: voltam pra casa e dormem; um ou outro notívago perambula.
 *
 * Só a decisão de "para onde ir agora" (o objetivo) vive aqui, como função pura
 * e testável; o SettlementManager traduz o objetivo em alvo/movimento.
 */

export type Archetype = 'worker' | 'homebody' | 'wanderer' | 'social' | 'nightowl';
export type Goal = 'home' | 'work' | 'hall' | 'roam' | 'sleep';

/** Arquétipos sorteados para os moradores comuns (peso: poucos notívagos). */
export const ROUTINE_ARCHETYPES: Archetype[] = ['social', 'wanderer', 'homebody', 'social', 'wanderer', 'nightowl'];

export type Phase = 'manha' | 'almoco' | 'tarde' | 'entardecer' | 'noite';

/** Fase do dia a partir da hora ∈ [0,1) (0 = amanhecer, ~0.5 = anoitecer). */
export function dayPhase(time: number): Phase {
  const t = ((time % 1) + 1) % 1;
  if (t < 0.25) return 'manha';
  if (t < 0.38) return 'almoco';
  if (t < 0.55) return 'tarde';
  if (t < 0.70) return 'entardecer';
  return 'noite';
}

/** Hash determinístico simples de uma semente numérica + dia (variação diária). */
function vary(seed: number, day: number, mod: number): number {
  let h = (seed ^ ((day + 1) * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  return h % mod;
}

/**
 * Objetivo atual de um morador dado o arquétipo, a hora e a semente (id) + dia.
 * A variação por dia faz o mesmo morador sair de manhã num dia e à tarde noutro,
 * e almoçar em casa ou no salão conforme o dia — a vila nunca repete igual.
 */
export function routineGoal(archetype: Archetype, time: number, opts: { seed: number; day: number }): Goal {
  const phase = dayPhase(time);
  const { seed, day } = opts;

  // Entardecer: comunhão no salão (todos, menos notívago que ainda dorme).
  if (phase === 'entardecer') return archetype === 'nightowl' ? 'sleep' : 'hall';
  // Noite: em casa dormindo; notívago perambula.
  if (phase === 'noite') return archetype === 'nightowl' ? 'roam' : 'sleep';
  // Almoço: metade no salão, metade em casa (varia por dia); notívago dorme.
  if (phase === 'almoco') {
    if (archetype === 'nightowl') return 'sleep';
    return vary(seed, day, 2) === 0 ? 'hall' : 'home';
  }

  // Manhã / tarde: cada arquétipo cuida do seu.
  const isMorning = phase === 'manha';
  switch (archetype) {
    case 'worker': return 'work';
    case 'homebody': return 'home';
    case 'wanderer': return 'roam';
    case 'nightowl': return 'sleep'; // dorme de dia
    case 'social': {
      // Sai de manhã OU à tarde, conforme o dia; no resto fica em casa.
      const outMorning = vary(seed, day, 2) === 0;
      return outMorning === isMorning ? 'roam' : 'home';
    }
  }
}

/** Raio de dispersão do alvo em torno da âncora, por objetivo. */
export function goalSpread(goal: Goal): number {
  switch (goal) {
    case 'roam': return 14;   // anda pela vila toda
    case 'hall': return 3;    // aglomera no salão
    case 'work': return 2.2;  // fica junto ao posto
    case 'sleep': return 0.7; // quieto em casa
    default: return 5;        // home: perto de casa
  }
}
