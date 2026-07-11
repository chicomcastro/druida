import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { runScenario, runMatrix, rateDifficulty, equipForStyle } from '../src/gameplay/simMatrix.js';
import { C } from '../src/core/ecs/components.js';

const spawnGame = () => { const g = makeGame(); const pid = addPlayer(g, 0, 0, 0); return { game: g, playerId: pid }; };

/**
 * Matriz de simulação por estilo de jogo (E41): mede cada forma de jogar
 * (melee / melee+esquiva / ranged) contra cada inimigo, em 1 ou 3, e classifica
 * a dificuldade — a base de medição para a passada de balanceamento (E42).
 */
describe('Matriz de simulação por estilo (E41)', () => {
  it('rateDifficulty classifica pela sobrevivência, vida restante e tempo', () => {
    expect(rateDifficulty({ survived: false, hpLeftFrac: 0, ttk: null })).toBe('letal');
    expect(rateDifficulty({ survived: true, hpLeftFrac: 0.98, ttk: 0.8 })).toBe('trivial');
    expect(rateDifficulty({ survived: true, hpLeftFrac: 0.85, ttk: 3 })).toBe('fácil');
    expect(rateDifficulty({ survived: true, hpLeftFrac: 0.6, ttk: 4 })).toBe('médio');
    expect(rateDifficulty({ survived: true, hpLeftFrac: 0.4, ttk: 6 })).toBe('difícil');
    expect(rateDifficulty({ survived: true, hpLeftFrac: 0.1, ttk: 9 })).toBe('brutal');
  });

  it('equipForStyle dá arma ranged ao estilo à distância (projétil no ataque)', () => {
    const { game, playerId } = spawnGame();
    equipForStyle(game, playerId, 'ranged', 1);
    const eq = game.world.get(playerId, C.Equipment);
    expect(eq.weapon.style).toBe('ranged');
    equipForStyle(game, playerId, 'melee', 1);
    expect(game.world.get(playerId, C.Equipment).weapon.style).toBe('melee');
  });

  it('runScenario roda o cenário e devolve métricas + nota de dificuldade', () => {
    const r = runScenario(spawnGame, { style: 'melee', enemy: 'rotboar', count: 1, seed: 1 });
    expect(r.survived).toBe(true);
    expect(r.ttk).toBeGreaterThan(0);
    expect(r.dps).toBeGreaterThan(0);
    expect(['trivial', 'fácil', 'médio', 'difícil', 'brutal', 'letal']).toContain(r.rating);
  });

  it('ESQUIVAR reduz o dano sofrido vs. um inimigo que telegrafa o golpe', () => {
    const plain = runScenario(spawnGame, { style: 'melee', enemy: 'husk', count: 1, seed: 5 });
    const dodge = runScenario(spawnGame, { style: 'melee_dodge', enemy: 'husk', count: 1, seed: 5 });
    expect(dodge.dmgTaken).toBeLessThan(plain.dmgTaken);
  });

  it('RANGED (kite) limpa sem tomar dano e com DPS atribuído (fix de projétil)', () => {
    const r = runScenario(spawnGame, { style: 'ranged', enemy: 'rotboar', count: 1, seed: 2 });
    expect(r.ttk).toBeGreaterThan(0);   // matou à distância
    expect(r.dps).toBeGreaterThan(0);   // dano do projétil é atribuído ao jogador
    expect(r.dmgTaken).toBeLessThan(5); // manteve distância
  });

  it('REAÇÃO imperfeita: quanto mais o robô esquiva, menos dano toma (E43)', () => {
    // husk telegrafa um golpe corpo-a-corpo limpo — dá sinal monotônico.
    const taken = (reaction: number) =>
      runScenario(spawnGame, { style: 'melee_dodge', enemy: 'husk', count: 1, seed: 7, ticks: 2400, reaction }).dmgTaken;
    const never = taken(0), half = taken(0.5), always = taken(1);
    expect(never).toBeGreaterThan(half);   // nunca esquivar sofre mais que às vezes
    expect(half).toBeGreaterThan(always);  // ...que sempre esquivar
    expect(always).toBeLessThan(5);        // esquivador perfeito quase não apanha
  });

  it('runMatrix devolve uma linha por (estilo × inimigo × qtd × nível)', () => {
    const rows = runMatrix(spawnGame, {
      styles: ['melee', 'ranged'], enemies: ['rotboar', 'husk'], counts: [1, 3], levels: [1], seeds: [1],
    });
    expect(rows.length).toBe(2 * 2 * 2 * 1);
    for (const r of rows) expect(r.rating).toBeTruthy();
    // Três inimigos custam mais que um (mais dano sofrido OU mais tempo).
    const one = rows.find((r) => r.style === 'melee' && r.enemy === 'rotboar' && r.count === 1)!;
    const three = rows.find((r) => r.style === 'melee' && r.enemy === 'rotboar' && r.count === 3)!;
    expect((three.dmgTaken > one.dmgTaken) || ((three.ttk ?? 0) > (one.ttk ?? 0))).toBe(true);
  });
});
