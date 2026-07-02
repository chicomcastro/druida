import { describe, it, expect } from 'vitest';
import { makeGame } from './helpers.js';
import { DayNightManager, WEATHERS } from '../src/world/DayNightManager.js';
import { BALANCE } from '../src/data/balance.js';
import { BIOME_ORDER } from '../src/data/biomes.js';

const mk = () => {
  const g = makeGame();
  g.worldManager = { currentBiome: 'pantano' };
  const dn = new DayNightManager(g);
  g.dayNight = dn;
  return { g, dn };
};

describe('DayNightManager — ciclo', () => {
  it('todo bioma tem clima definido', () => {
    for (const b of BIOME_ORDER) expect(WEATHERS[b], b).toBeTruthy();
  });

  it('o tempo avança, vira noite e amanhece (eventos uma vez por virada)', () => {
    const { g, dn } = mk();
    expect(dn.isNight()).toBe(false);
    expect(dn.nightAmount()).toBe(0);

    // Avança até a noite plena.
    dn.time = 1 - BALANCE.dayNight.nightFraction / 2;
    dn.update(0.016);
    expect(dn.isNight()).toBe(true);
    expect(dn.nightAmount()).toBe(1);
    expect(g.events.filter((e) => e.e === 'nightFall').length).toBe(1);
    dn.update(0.016); // não repete
    expect(g.events.filter((e) => e.e === 'nightFall').length).toBe(1);

    // Wrap do ciclo -> amanhece.
    dn.time = 0.999;
    dn.update((0.002) * BALANCE.dayNight.cycleSeconds);
    expect(dn.isNight()).toBe(false);
    expect(g.events.filter((e) => e.e === 'dayBreak').length).toBe(1);
  });

  it('crepúsculo é suave (0 < nightAmount < 1) e a noite reforça luz/spawn', () => {
    const { dn } = mk();
    dn.time = 1 - BALANCE.dayNight.nightFraction; // exatamente na virada
    const twilight = dn.nightAmount();
    expect(twilight).toBeGreaterThan(0);
    expect(twilight).toBeLessThan(1);
    dn.time = 0.98; // noite plena
    expect(dn.lightBoost()).toBeCloseTo(1.7);
  });

  it('não avança dentro de masmorra', () => {
    const { g, dn } = mk();
    g.inDungeon = true;
    const t = dn.time;
    dn.update(100);
    expect(dn.time).toBe(t);
  });
});

describe('DayNightManager — clima', () => {
  it('sorteia clima do bioma atual, anuncia e depois acalma', () => {
    const { g, dn } = mk();
    dn.rng = Object.assign(() => 0.5, { range: (a: number) => a, chance: () => true });
    dn._weatherT = 0;
    dn.update(0.016); // inicia clima do pântano
    expect(dn.weather?.kind).toBe('pantano');
    expect(dn.weatherAmbient()).toBe(WEATHERS.pantano.ambient);
    expect(dn.icon()).toBe(WEATHERS.pantano.icon);
    expect(g.events.some((e) => e.e === 'weatherChanged' && e.p.kind === 'pantano')).toBe(true);

    dn._weatherT = 0;
    dn.update(0.016); // encerra
    expect(dn.weather).toBeNull();
    expect(dn.weatherAmbient()).toBeNull();
    expect(g.events.some((e) => e.e === 'weatherChanged' && e.p.kind === null)).toBe(true);
  });

  it('sem sorte no sorteio, segue calmaria (sem evento de clima)', () => {
    const { g, dn } = mk();
    dn.rng = Object.assign(() => 0.5, { range: (a: number) => a, chance: () => false });
    dn._weatherT = 0;
    dn.update(0.016);
    expect(dn.weather).toBeNull();
    expect(g.events.filter((e) => e.e === 'weatherChanged').length).toBe(0);
  });
});
