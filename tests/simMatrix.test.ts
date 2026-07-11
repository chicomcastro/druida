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

  it('CASTER dispara o artefato: causa dano atribuído e não fica atrás do ranged (E44)', () => {
    const ranged = runScenario(spawnGame, { style: 'ranged', enemy: 'husk', count: 1, seed: 2, ticks: 3000 });
    const caster = runScenario(spawnGame, { style: 'caster', enemy: 'husk', count: 1, seed: 2, ticks: 3000 });
    expect(caster.ttk).toBeGreaterThan(0);       // limpou
    expect(caster.dps).toBeGreaterThan(20);      // dano real atribuído (basic + artefato)
    expect(caster.dps).toBeGreaterThan(ranged.dps * 0.9); // o artefato SOMA ao ataque básico
  });

  it('FORMAS Lobo/Urso ativam e batem mais forte que o humanoide inicial (E44)', () => {
    const dps = (form?: string) => {
      let s = 0; for (const seed of [1, 2, 3]) s += runScenario(spawnGame, { style: 'melee', enemy: 'rotboar', count: 1, seed, ticks: 3000, form }).dps;
      return s / 3;
    };
    const humano = dps(), wolf = dps('wolf'), bear = dps('bear');
    expect(wolf).toBeGreaterThan(humano);  // Lobo: cadência rápida → DPS alto
    expect(bear).toBeGreaterThan(humano);  // Urso: patada pesada + atordoa
  });

  it('FORMAS à distância: Corvo kita/atira e Sapo agarra à média distância (E47)', () => {
    // Corvo = projétil rápido (raven_peck) + voa → kita sem apanhar.
    const raven = runScenario(spawnGame, { style: 'ranged', enemy: 'husk', count: 1, seed: 2, ticks: 3000, form: 'raven' });
    expect(raven.ttk).toBeGreaterThan(0);
    expect(raven.dps).toBeGreaterThan(20);
    expect(raven.dmgTaken).toBeLessThan(5);
    // Sapo = língua (arco de 3.2u, veneno + puxão) → precisa se aproximar; à
    // distância (ranged) não alcança, no corpo-a-corpo causa dano.
    const frogRanged = runScenario(spawnGame, { style: 'ranged', enemy: 'husk', count: 1, seed: 2, ticks: 3000, form: 'frog' });
    const frogMelee = runScenario(spawnGame, { style: 'melee', enemy: 'husk', count: 1, seed: 2, ticks: 3000, form: 'frog' });
    expect(frogRanged.dps).toBeLessThan(5);       // longe demais: a língua não pega
    expect(frogMelee.dps).toBeGreaterThan(15);    // aproximando, morde e envenena
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
