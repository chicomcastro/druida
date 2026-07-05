import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { aiSystem } from '../src/systems/ai.js';
import { ENEMIES } from '../src/data/enemies.js';
import { BIOMES } from '../src/data/biomes.js';

describe('Novos inimigos (ADR 0100, E8.3)', () => {
  it('existem no catálogo com status no golpe', () => {
    expect(ENEMIES.bogbrute.onHit).toEqual({ poison: 2.5 });
    expect(ENEMIES.ashwraith.onHit).toEqual({ stun: 0.5 });
    expect(ENEMIES.frostfang.onHit).toEqual({ freeze: 0.9 });
  });

  it('estão nas tabelas de spawn dos biomas certos', () => {
    const keys = (b: string) => BIOMES[b].enemies.map((e: any) => e.key);
    expect(keys('pantano')).toContain('bogbrute');
    expect(keys('bosque_cinza')).toContain('ashwraith');
    expect(keys('picos')).toContain('frostfang');
  });

  it('spawnEnemyByKey cria o inimigo com o gatilho onHit na IA', () => {
    const g = makeGame();
    const id = g.spawnEnemyByKey('frostfang', 5, 0);
    const ai = g.world.get(id, C.AI);
    expect(ai.behavior).toBe('melee');
    expect(ai.onHit).toEqual({ freeze: 0.9 });
  });

  it('o golpe aplica o status do inimigo no jogador', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    g.spawnEnemyByKey('frostfang', 1, 0); // dentro do attackRange
    const hpBefore = g.world.get(pid, C.Health).hp;
    for (let i = 0; i < 5; i++) aiSystem(g, 0.15); // telegraph + golpe
    expect(g.world.get(pid, C.Health).hp).toBeLessThan(hpBefore);
    expect(g.world.get(pid, C.StatusEffects).freeze).toBeGreaterThan(0);
  });
});
