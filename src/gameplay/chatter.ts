/**
 * Conversas entre aldeões (E22.5 — Vila viva). Quando dois moradores se cruzam
 * (parados, longe do jogador, acordados), eles se viram um pro outro e um solta
 * uma fala curta (balão flutuante). Um cooldown evita tagarelice sem fim. Só a
 * decisão vive aqui, pura e testável; o SettlementManager cuida do movimento e
 * o DamageNumbers desenha o balão.
 */

/** Distância máxima para dois aldeões puxarem conversa. */
export const CHAT_RANGE = 2.0;
/** Tempo (s) até o mesmo aldeão poder conversar de novo. */
export const CHAT_COOLDOWN = 14;

/** Falas curtas de vila (smalltalk); escolhidas de forma determinística. */
export const CHAT_LINES = [
  'Bom dia!', 'Bela manhã.', 'Tudo em paz?', 'Viu o druida?', 'A colheita vem boa.',
  'Fique com os espíritos.', 'Cuidado lá fora.', 'Como vai a família?', 'Passe bem!',
  'O caldo tá cheirando bem.', 'Dormiu bem?', 'Até o entardecer!',
];

/** Um aldeão pode conversar agora? (acordado e fora do cooldown). */
export function chatEligible(v: { goal?: string; chatUntil?: number }, now: number): boolean {
  if (v.goal === 'sleep') return false;
  return now >= (v.chatUntil ?? 0);
}

/** Decide se A e B trocam uma prosa neste instante. */
export function shouldChat(
  a: { goal?: string; chatUntil?: number },
  b: { goal?: string; chatUntil?: number },
  dist: number,
  now: number,
): boolean {
  return dist <= CHAT_RANGE && chatEligible(a, now) && chatEligible(b, now);
}

/** Escolhe uma fala determinística por semente + dia (varia entre encontros). */
export function pickChatLine(seed: number, day = 0): string {
  let h = (seed ^ ((day + 1) * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x85ebca6b) >>> 0;
  return CHAT_LINES[h % CHAT_LINES.length];
}
