import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { SimPlayer, SimMetrics, runSimulation, mulberry32 } from '../src/gameplay/simulator.js';

/**
 * Simulador sintético (E40): um jogador-robô joga de verdade (decide inputs a
 * partir do estado do mundo) e um coletor de métricas mede o balanceamento.
 */
describe('Simulador sintético (E40)', () => {
  it('mulberry32 é determinístico e fica em [0,1)', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 5; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('o robô caça: aproxima do inimigo e ataca quando no alcance', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    // Inimigo à frente (mesma configuração dos testes de combate).
    g.spawnEnemyByKey('rotboar', 1.4, 0);
    const bot = new SimPlayer(1);
    const inp = bot.decide(g, pid);
    expect(inp.attack).toBe(true);               // colado → golpeia
    expect(inp.aimX).toBeGreaterThan(0.9);        // mira o inimigo (+X)

    // Longe: aproxima em vez de atacar.
    const g2 = makeGame();
    const p2 = addPlayer(g2, 0, 0, 0);
    g2.spawnEnemyByKey('rotboar', 8, 0);
    const inp2 = new SimPlayer(1).decide(g2, p2);
    expect(inp2.attack).toBe(false);
    expect(inp2.moveX).toBeGreaterThan(0.9);      // caminha para o alvo
  });

  it('sem inimigos, o robô EXPLORA (desloca-se pelo mundo)', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    const rep = runSimulation(g, { playerId: pid, ticks: 200, seed: 7 });
    expect(rep.ticks).toBe(200);
    expect(rep.netDisplacement).toBeGreaterThan(1); // saiu do lugar explorando
    expect(rep.kills).toBe(0);
  });

  it('rodando o jogo, o robô abate um inimigo e as métricas registram', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    g.spawnEnemyByKey('rotboar', 2.2, 0); // fraco e perto: o bot resolve em pouco tempo
    const rep = runSimulation(g, { playerId: pid, ticks: 900, seed: 3 });
    expect(rep.kills).toBeGreaterThanOrEqual(1);
    expect(rep.damageDealt).toBeGreaterThan(0);
    expect(rep.dps).toBeGreaterThan(0);
    expect(rep.killsPerMin).toBeGreaterThan(0);
    expect(rep.survived).toBe(true); // um rotboar não derruba o jogador inicial
  });

  it('o relatório deriva as métricas de balanceamento a partir dos eventos', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    const m = new SimMetrics().attach(g, pid);
    // Eventos sintéticos: dano causado, dano sofrido, abate, essência, drop.
    g.emit('damage', { id: 999, attackerId: pid, amount: 30 });
    g.emit('damage', { id: pid, amount: 12 });
    g.emit('kill', { id: 999, attackerId: pid });
    g.emit('essence', { amount: 15 });
    g.emit('itemPickup', { id: pid, item: { rarity: 'rare' } });
    for (let i = 0; i < 60; i++) m.tick(1 / 60); // 1 s
    const rep = m.report();
    expect(rep.kills).toBe(1);
    expect(rep.damageDealt).toBe(30);
    expect(rep.damageTaken).toBe(12);
    expect(rep.dps).toBeCloseTo(30, 0);
    expect(rep.essence).toBe(15);
    expect(rep.drops).toBe(1);
    expect(rep.dropsByRarity.rare).toBe(1);
  });

  it('é determinístico: mesma semente → mesmo relatório', () => {
    const run = () => {
      const g = makeGame();
      const pid = addPlayer(g, 0, 0, 0);
      g.spawnEnemyByKey('rotboar', 3, 0);
      return runSimulation(g, { playerId: pid, ticks: 300, seed: 11 });
    };
    const a = run(), b = run();
    expect(a.kills).toBe(b.kills);
    expect(a.damageDealt).toBeCloseTo(b.damageDealt, 6);
    expect(a.netDisplacement).toBeCloseTo(b.netDisplacement, 6);
  });
});
