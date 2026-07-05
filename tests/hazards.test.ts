import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { HazardManager } from '../src/world/HazardManager.js';
import { OVERWORLD_HAZARDS } from '../src/data/hazards.js';

describe('Perigos ambientais por bioma (ADR 0099)', () => {
  it('a Clareira é segura; os demais biomas têm perigo', () => {
    expect(OVERWORLD_HAZARDS.clareira).toBe(null);
    for (const b of ['pantano', 'bosque_cinza', 'picos', 'coracao']) {
      expect(OVERWORLD_HAZARDS[b]).toBeTruthy();
    }
  });

  it('no pântano selvagem, dispara uma zona telegrafada', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 80, z: 0 }; // pantano
    addPlayer(g, 0, 80, 0);
    const hm = new HazardManager(g);
    hm.update(OVERWORLD_HAZARDS.pantano!.interval + 0.1);
    expect(g.events.some((e) => e.e === 'vfxRing')).toBe(true);
    expect(hm.pending.length).toBe(1);
  });

  it('o golpe telegrafado atinge quem fica na zona (dano + status)', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 80, z: 0 };
    const pid = addPlayer(g, 0, 80, 0);
    const hm = new HazardManager(g);
    const hp = g.world.get(pid, C.Health);
    hp.hp = hp.max;
    hm._strike({ x: 80, z: 0, hz: OVERWORLD_HAZARDS.pantano });
    expect(hp.hp).toBeLessThan(hp.max);
    expect(g.world.get(pid, C.StatusEffects).root).toBeGreaterThan(0);
  });

  it('a Clareira não dispara nada', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 0, z: 0 }; // clareira (hazard null)
    addPlayer(g, 0, 0, 0);
    const hm = new HazardManager(g);
    hm.update(60);
    expect(hm.pending.length).toBe(0);
    expect(g.events.some((e) => e.e === 'vfxRing')).toBe(false);
  });

  it('suspenso em masmorra/interior', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 80, z: 0 };
    g.inDungeon = true;
    addPlayer(g, 0, 80, 0);
    const hm = new HazardManager(g);
    hm.update(60);
    expect(hm.pending.length).toBe(0);
  });

  it('vilas são refúgio: sem perigos ambientais', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 80, z: 0 };
    g.settlements = { isSafe: () => true };
    addPlayer(g, 0, 80, 0);
    const hm = new HazardManager(g);
    hm.update(60);
    expect(hm.pending.length).toBe(0);
    expect(g.events.some((e) => e.e === 'vfxRing')).toBe(false);
  });

  it('a zona pendente é resolvida no update seguinte', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 80, z: 0 };
    addPlayer(g, 0, 80, 0);
    const hm = new HazardManager(g);
    hm.update(OVERWORLD_HAZARDS.pantano!.interval + 0.1); // telegrafa
    expect(hm.pending.length).toBe(1);
    hm.update(OVERWORLD_HAZARDS.pantano!.telegraph + 0.1); // golpe
    expect(hm.pending.length).toBe(0);
  });
});
