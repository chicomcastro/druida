/**
 * Cronograma dos moradores (E34 — vida com rotina de verdade). Cada NPC tem um
 * LUGAR determinístico em função da hora do jogo e do dia, **independente de onde
 * o jogador esteja** (dentro ou fora de um interior). Consequências:
 *
 *  - num dado horário, o NPC está em UM lugar só (nunca em dois);
 *  - dá pra sair e voltar (mesmo bloco de tempo) que ele continua lá;
 *  - de um dia pro outro no mesmo horário pode variar um pouco (delta diário);
 *  - o `SettlementManager` aplica isso todo tique: quem está "dentro de um recinto"
 *    some da multidão externa e só aparece quando o jogador entra naquela porta.
 *
 * Função pura e testável: recebe o NPC, a hora ∈ [0,1), o dia e os recintos
 * (venues) da vila; devolve o objetivo da rotina + o recinto onde ele está (se
 * estiver dentro de algum). O SettlementManager traduz isso em esconder/mostrar
 * e em movimento externo (usando o objetivo como hoje).
 */

import { routineGoal, type Archetype, type Goal } from './routine.js';

export interface Venue { id: string; themeId: string; service: string; x: number; z: number; kind?: 'public' | 'home'; }

/** Hash determinístico (mesma família do routine.ts) — semente + dia. */
function vary(seed: number, day: number, mod: number): number {
  let h = (seed ^ ((day + 1) * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  return mod > 0 ? h % mod : 0;
}

/**
 * Separa os recintos PÚBLICOS da vila em locais de trabalho (lojas) e sociais
 * (taverna/salão/liderança). Moradias (kind 'home') NÃO entram aqui — são privadas
 * e o NPC vai à SUA casa (npc.homeVenueId), não a uma casa qualquer (E36).
 */
export function classifyVenues(venues: Venue[]): { work: Venue[]; social: Venue[] } {
  const work: Venue[] = [], social: Venue[] = [];
  for (const v of venues) {
    if (v.kind === 'home') continue;
    (v.service === 'shop' ? work : social).push(v);
  }
  return { work, social };
}

export interface Place { goal: Goal; inside: string | null; }

/**
 * Lugar do NPC agora: objetivo da rotina + recinto (id) se estiver DENTRO.
 * - trabalho → dentro de uma loja (se houver), senão no posto (fora);
 * - salão (entardecer) → dentro de um recinto social público;
 * - casa → dentro da PRÓPRIA moradia (npc.homeVenueId, E36);
 * - dormir (noite) → parte na taverna (social), parte dorme na PRÓPRIA casa;
 * - passear → fora.
 * A escolha do recinto é determinística por (semente, dia) → estável no bloco,
 * varia de um dia pro outro. Casa é sempre a mesma (a do NPC).
 */
export function npcPlace(npc: { seed?: number; id?: number; archetype?: Archetype; homeVenueId?: string | null }, time: number, day: number, venues: Venue[]): Place {
  const seed = npc.seed ?? npc.id ?? 0;
  const goal = routineGoal(npc.archetype ?? 'social', time, { seed, day });
  const { work, social } = classifyVenues(venues);
  const pick = (arr: Venue[], salt: number) => (arr.length ? arr[vary(seed, day + salt, arr.length)] : null);
  const home = npc.homeVenueId ?? null;
  if (goal === 'home') return { goal, inside: home };
  if (goal === 'sleep') {
    // Noite: ~2/3 ainda na taverna (social), o resto dorme na PRÓPRIA casa.
    const v = social.length && vary(seed, day, 3) !== 0 ? pick(social, 22) : null;
    return { goal, inside: v ? v.id : home };
  }
  let inside: Venue | null = null;
  if (goal === 'work') inside = pick(work, 11);
  else if (goal === 'hall') inside = pick(social, 22);
  return { goal, inside: inside ? inside.id : null };
}
