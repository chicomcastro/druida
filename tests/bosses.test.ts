import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { spawnBossByKey } from '../src/gameplay/spawn.js';
import { bossSystem } from '../src/systems/boss.js';
import { BOSSES } from '../src/data/enemies.js';
import { DUNGEON_THEMES } from '../src/data/dungeons.js';

describe('Novos bosses (ADR 0101, E8.4)', () => {
  it('estão no catálogo como chefes plenos', () => {
    for (const key of ['mirelord', 'frostreaver']) {
      expect(BOSSES[key].boss).toBe(true);
      expect(BOSSES[key].hp).toBeGreaterThan(500);
    }
    expect(BOSSES.mirelord.summon).toBe('bogbrute');
    expect(BOSSES.frostreaver.onHit).toEqual({ freeze: 1.0 });
  });

  it('spawnBossByKey cria um chefe pleno (não mini) com nome e anúncio', () => {
    const g = makeGame();
    const id = spawnBossByKey(g, 'mirelord', 0, 0);
    const boss = g.world.get(id, C.Boss);
    expect(boss.name).toBe('Senhor do Lodo');
    expect(boss.miniBoss).toBeFalsy(); // chefe pleno = fases + invocações
    expect(g.events.some((e) => e.e === 'objective' && /Senhor do Lodo/.test(e.p.text))).toBe(true);
  });

  it('spawnBossByKey ignora chave inválida', () => {
    const g = makeGame();
    expect(spawnBossByKey(g, 'naoexiste', 0, 0)).toBe(null);
  });

  it('o bossSystem conduz o chefe (slam telegrafado)', () => {
    const g = makeGame();
    addPlayer(g, 0, 2, 0);
    spawnBossByKey(g, 'frostreaver', 0, 0);
    for (let i = 0; i < 3; i++) bossSystem(g, 1.0); // avança o slamTimer
    expect(g.events.some((e) => e.e === 'vfxMarker')).toBe(true);
  });

  it('as masmorras do pântano e dos picos usam os chefes plenos', () => {
    expect(DUNGEON_THEMES.pantano.miniboss.boss).toBe('mirelord');
    expect(DUNGEON_THEMES.picos.miniboss.boss).toBe('frostreaver');
    // Os demais temas seguem com mini-chefe (sem `boss`).
    expect(DUNGEON_THEMES.clareira.miniboss.boss).toBeUndefined();
  });
});
