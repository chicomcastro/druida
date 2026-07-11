import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { runMatrix, runScenario } from '../src/gameplay/simMatrix.js';
import { BALANCE } from '../src/data/balance.js';

const spawnGame = () => { const g = makeGame(); const pid = addPlayer(g, 0, 0, 0); return { game: g, playerId: pid }; };
const avgHp = (rows: any[]) => rows.reduce((s, r) => s + r.hpLeftFrac, 0) / rows.length * 100;

/**
 * Canary de balanceamento (E42, ADR 0175): trava as faixas-alvo medidas pelo
 * simulador (bot melee-sem-esquiva como PISO de dificuldade), para que um tuning
 * futuro não deixe o jogo trivial nem impossível sem alguém perceber. Usa poucos
 * inimigos/sementes e teto de ticks baixo para rodar rápido no CI.
 */
describe('Canary de balanceamento (E42)', () => {
  it('os fatores globais de dificuldade estão presentes e ativos', () => {
    expect(BALANCE.enemy.hpBase).toBeGreaterThan(1);   // inimigos mais resistentes que a base crua
    expect(BALANCE.enemy.damageBase).toBeGreaterThan(1); // e batendo mais forte
  });

  it('1 inimigo comum dá trabalho (não trivial) e 3 juntos são bem mais difíceis', () => {
    // rotboar (leve) + frostfang (médio): ambos resolvem sem timeout, então a
    // vida restante é sinal limpo de dificuldade. melee = piso (pior caso).
    const rows = runMatrix(spawnGame, {
      styles: ['melee'], enemies: ['rotboar', 'frostfang'], counts: [1, 3], levels: [1], seeds: [1, 2], ticks: 2400,
    });
    const solo = rows.filter((r) => r.count === 1);
    const pack = rows.filter((r) => r.count === 3);
    const soloHp = avgHp(solo), packHp = avgHp(pack);

    // 1 comum: não é trivial (deixa < 90% de vida) mas também não massacra (> 45%).
    expect(soloHp).toBeLessThan(90);
    expect(soloHp).toBeGreaterThan(45);
    // 3 juntos custam MUITO mais que 1 (delta grande) e ficam genuinamente duros.
    expect(soloHp - packHp).toBeGreaterThan(20);
    expect(packHp).toBeLessThan(55);
  });

  it('o inimigo "duro" (Espectro) é fatal para quem não esquiva, mas justo p/ quem esquiva', () => {
    // Piso (melee sem esquiva): não consegue derrubá-lo (é rápido e atordoa —
    // encarar de frente não funciona). Sinal robusto: não limpa (ttk nulo).
    const plain = runScenario(spawnGame, { style: 'melee', enemy: 'ashwraith', count: 1, seed: 1, ticks: 2400 });
    expect(plain.ttk).toBe(null);
    // Jogador que ESQUIVA o telégrafo vence com folga (não é injusto).
    const dodge = runScenario(spawnGame, { style: 'melee_dodge', enemy: 'ashwraith', count: 1, seed: 1, ticks: 3000 });
    expect(dodge.survived).toBe(true);
    // À distância (kite) também resolve sem apanhar.
    const ranged = runScenario(spawnGame, { style: 'ranged', enemy: 'ashwraith', count: 1, seed: 1, ticks: 2400 });
    expect(ranged.survived).toBe(true);
    expect(ranged.ttk).toBeGreaterThan(0);
  });
});
