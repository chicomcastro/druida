import { describe, it, expect } from 'vitest';
import { itemIconURL } from '../src/ui/itemIcons.js';

// Headless (sem document): devolve '' sem quebrar — o slot cai no emoji.
describe('Ícones de item (ADR 0090)', () => {
  it('sem canvas devolve string vazia (headless-safe)', () => {
    expect(itemIconURL({ type: 'weapon', family: 'axe', element: 'ice', rarity: 'rare' })).toBe('');
  });
  it('item nulo devolve vazio', () => {
    expect(itemIconURL(null)).toBe('');
  });
});
