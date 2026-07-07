import { describe, it, expect } from 'vitest';
import { shouldChat, chatEligible, pickChatLine, CHAT_LINES, CHAT_RANGE, CHAT_COOLDOWN } from '../src/gameplay/chatter.js';

describe('chatter — conversa entre aldeões (E22.5)', () => {
  it('elegível quando acordado e fora do cooldown', () => {
    expect(chatEligible({ goal: 'roam' }, 0)).toBe(true);
    expect(chatEligible({ goal: 'sleep' }, 0)).toBe(false);          // dormindo não conversa
    expect(chatEligible({ goal: 'roam', chatUntil: 10 }, 5)).toBe(false); // em cooldown
    expect(chatEligible({ goal: 'roam', chatUntil: 10 }, 12)).toBe(true); // cooldown passou
  });

  it('conversam só perto, acordados e sem cooldown', () => {
    const a = { goal: 'hall' }, b = { goal: 'roam' };
    expect(shouldChat(a, b, CHAT_RANGE - 0.1, 0)).toBe(true);
    expect(shouldChat(a, b, CHAT_RANGE + 0.5, 0)).toBe(false);        // longe demais
    expect(shouldChat(a, { goal: 'sleep' }, 1, 0)).toBe(false);       // o outro dorme
    expect(shouldChat({ goal: 'roam', chatUntil: 20 }, b, 1, 5)).toBe(false); // em cooldown
  });

  it('a fala é determinística e sai do rol', () => {
    const line = pickChatLine(123, 0);
    expect(CHAT_LINES).toContain(line);
    expect(pickChatLine(123, 0)).toBe(line);          // determinístico
    // varia entre dias (ao menos um dia difere para a mesma semente)
    const days = [0, 1, 2, 3, 4].map((d) => pickChatLine(123, d));
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('cooldown é positivo (evita tagarelice)', () => {
    expect(CHAT_COOLDOWN).toBeGreaterThan(0);
  });
});
