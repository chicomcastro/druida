import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { SETTLEMENTS } from '../src/data/settlements.js';
import { SettlementManager } from '../src/world/SettlementManager.js';
import { biomeAt } from '../src/world/WorldManager.js';
import { interactionSystem } from '../src/systems/interaction.js';

describe('SETTLEMENTS (dados)', () => {
  it('há pelo menos 3 cidades e cada uma está no anel do seu bioma', () => {
    expect(SETTLEMENTS.length).toBeGreaterThanOrEqual(3);
    for (const s of SETTLEMENTS) expect(biomeAt(s.x, s.z)).toBe(s.biome);
  });

  it('cada cidade tem identidade: tagline, chegada e moradores com falas', () => {
    for (const s of SETTLEMENTS) {
      expect(s.tagline.length).toBeGreaterThan(0);
      expect(s.arrival.length).toBeGreaterThan(0);
      expect(s.villagers.length).toBeGreaterThanOrEqual(2);
      for (const v of s.villagers) expect(v.lines.length).toBeGreaterThan(0);
    }
  });
});

describe('SettlementManager', () => {
  it('constrói as vilas com moradores interativos e colisores', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    const villagers = [...g.world.query(C.Interactable)].filter(([, i]: any) => i.kind === 'villager');
    // Todos os moradores definidos nos dados viram interativos no mundo.
    const total = SETTLEMENTS.reduce((n, s) => n + s.villagers.length, 0);
    expect(villagers.length).toBe(total);
    // Estruturas geram colisores sólidos (cabanas, fogueiras, paliçada…).
    const colliders = [...g.world.query(C.Collider)].filter(([, c]: any) => c.solid);
    expect(colliders.length).toBeGreaterThan(total + 10);
    expect(sm.isSafe(0, 0)).toBe(true);
    expect(sm.isSafe(999, 999)).toBe(false);
    const s1 = SETTLEMENTS[1];
    expect(sm.settlementAt(s1.x, s1.z)?.id).toBe(s1.id);
  });

  it('anuncia a chegada (diálogo só na 1ª visita; banner sempre)', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    const s1 = SETTLEMENTS[1];
    g.groupCenter = { x: s1.x, z: s1.z };
    sm.update();
    expect(g.events.filter((e) => e.e === 'settlementEntered').length).toBe(1);
    expect(g.events.filter((e) => e.e === 'dialogue').length).toBe(1);
    sm.update(); // ainda dentro: não repete
    expect(g.events.filter((e) => e.e === 'settlementEntered').length).toBe(1);
    // sai e volta: banner de novo, diálogo de chegada não
    g.groupCenter = { x: 500, z: 500 };
    sm.update();
    g.groupCenter = { x: s1.x, z: s1.z };
    sm.update();
    expect(g.events.filter((e) => e.e === 'settlementEntered').length).toBe(2);
    expect(g.events.filter((e) => e.e === 'dialogue').length).toBe(1);
  });

  it('não anuncia dentro de masmorra', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    g.inDungeon = true;
    g.groupCenter = { x: 0, z: 0 };
    sm.update();
    expect(g.events.filter((e) => e.e === 'settlementEntered').length).toBe(0);
  });

  it('morador conversa via interação (kind villager -> dialogue)', () => {
    const g = makeGame();
    new SettlementManager(g);
    const [, vtr, vint]: any = [...g.world.query(C.Transform, C.Interactable)]
      .find(([, , i]: any) => i.kind === 'villager');
    const pid = addPlayer(g, 0, vtr.x, vtr.z);
    g.world.get(pid, C.Intent).interact = true;
    interactionSystem(g, 0.016);
    const dlg: any = g.events.find((e) => e.e === 'dialogue');
    expect(dlg).toBeTruthy();
    expect(dlg.p.lines).toEqual(vint.lines);
  });

  it('animate pulsa lanternas/chamas e tremula as luzes sem erro', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    expect(sm._flames.length).toBeGreaterThan(0);
    expect(sm._lights.length).toBeGreaterThan(0);
    const before = sm._flames[0].mesh.material.emissiveIntensity;
    sm.animate(0.9);
    sm.animate(1.7);
    expect(sm._flames[0].mesh.material.emissiveIntensity).not.toBe(before);
  });
});
