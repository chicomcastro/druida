import { describe, it, expect } from 'vitest';
import { makeGame } from './helpers.js';
import {
  addReputation, reputationOf, repDiscount, shopSettlement,
  registerReputationHooks, REP_BY_QUEST,
} from '../src/gameplay/reputation.js';

describe('Reputação por vila (ADR 0108)', () => {
  it('addReputation soma, acumula e anuncia', () => {
    const g = makeGame();
    addReputation(g, 'vau_palafitas', 2);
    expect(reputationOf(g, 'vau_palafitas')).toBe(2);
    addReputation(g, 'vau_palafitas', 1);
    expect(reputationOf(g, 'vau_palafitas')).toBe(3);
    expect(reputationOf(g, 'cinzafolha')).toBe(0);
    expect(g.events.some((e) => e.e === 'reputationChanged')).toBe(true);
  });

  it('desconto em degraus: 0 / 5% / 10%', () => {
    const g = makeGame();
    expect(repDiscount(g, 'cinzafolha')).toBe(0);
    addReputation(g, 'cinzafolha', 1);
    expect(repDiscount(g, 'cinzafolha')).toBe(0); // ainda < 2
    addReputation(g, 'cinzafolha', 1);
    expect(repDiscount(g, 'cinzafolha')).toBeCloseTo(0.05); // 2
    addReputation(g, 'cinzafolha', 2);
    expect(repDiscount(g, 'cinzafolha')).toBeCloseTo(0.10); // 4
  });

  it('shopSettlement mapeia mercador de vila e lojas-família; neutraliza o resto', () => {
    expect(shopSettlement('vau_palafitas')).toBe('vau_palafitas'); // mercador regional
    expect(shopSettlement('interior:vau_arpo')).toBe('vau_palafitas'); // via família Vison
    expect(shopSettlement('interior:cinza_forno')).toBe('cinzafolha'); // via família Brasa
    expect(shopSettlement('interior:weapons')).toBe('circulo_carvalho'); // Fenwick
    expect(shopSettlement('interior:market')).toBe(null); // mercado geral (sem família)
    expect(shopSettlement('hub')).toBe(null);
    expect(shopSettlement(undefined)).toBe(null);
  });

  it('hooks: concluir a rixa rende +2 e a missão do ancião +1', () => {
    const g = makeGame();
    registerReputationHooks(g);
    g.emit('questCompleted', { id: 'feud_vau' });
    expect(reputationOf(g, 'vau_palafitas')).toBe(REP_BY_QUEST.feud_vau.amount);
    g.emit('questCompleted', { id: 'q_vau' });
    expect(reputationOf(g, 'vau_palafitas')).toBe(3); // 2 + 1
    g.emit('questCompleted', { id: 'inexistente' }); // não mapeada: ignora
    expect(reputationOf(g, 'vau_palafitas')).toBe(3);
  });

  it('rerollShop aplica o desconto da vila (preço das poções é determinístico)', () => {
    // As duas últimas entradas do estoque são poções de preço fixo por nível.
    const potionPrices = (g) => g.rerollShop().slice(-2).map((e) => e.price);

    const base = makeGame();
    base.progress.level = 3;
    base.activeShopKey = 'interior:vau_arpo';
    const full = potionPrices(base);

    const rep = makeGame();
    rep.progress.level = 3;
    rep.activeShopKey = 'interior:vau_arpo';
    addReputation(rep, 'vau_palafitas', 4); // 10% off
    const discounted = potionPrices(rep);

    expect(discounted[0]).toBeLessThan(full[0]);
    expect(discounted[1]).toBeLessThan(full[1]);
    // Numa vila sem reputação (mercado geral, sem família) não há desconto.
    const neutral = makeGame();
    neutral.progress.level = 3;
    neutral.activeShopKey = 'interior:market';
    addReputation(neutral, 'vau_palafitas', 4);
    expect(potionPrices(neutral)).toEqual(full);
  });
});
