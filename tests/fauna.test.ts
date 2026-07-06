import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { FaunaManager } from '../src/world/FaunaManager.js';
import { FAUNA_BY_BIOME } from '../src/data/fauna.js';

function tick(fm, n = 5, dt = 0.1) { for (let i = 0; i < n; i++) fm.update(dt); }

describe('Fauna ambiente (ADR 0098)', () => {
  it('cada bioma habitável tem fauna; o Coração não', () => {
    for (const b of ['clareira', 'pantano', 'bosque_cinza', 'picos']) {
      expect(FAUNA_BY_BIOME[b].length).toBeGreaterThan(0);
    }
    expect(FAUNA_BY_BIOME.coracao.length).toBe(0);
  });

  it('povoa a Clareira até o teto e não passa dele', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 0, z: 0 }; // clareira
    const fm = new FaunaManager(g);
    tick(fm, 6);
    expect(fm.critters.length).toBeGreaterThan(0);
    expect(fm.critters.length).toBeLessThanOrEqual(9);
    // Todos são espécies da Clareira.
    const ids = new Set(FAUNA_BY_BIOME.clareira.map((d) => d.id));
    for (const cr of fm.critters) expect(ids.has(cr.def.id)).toBe(true);
  });

  it('não spawna fauna no Coração Corrompido', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 0, z: -225 }; // coracao (mancha ao sul)
    const fm = new FaunaManager(g);
    tick(fm, 6);
    expect(fm.critters.length).toBe(0);
  });

  it('suspenso em masmorra/interior (inDungeon)', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 0, z: 0 };
    g.inDungeon = true;
    const fm = new FaunaManager(g);
    tick(fm, 6);
    expect(fm.critters.length).toBe(0);
  });

  it('o bicho foge quando um jogador se aproxima', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 0, z: 0 };
    const pid = addPlayer(g, 0, 0, 0);
    const fm = new FaunaManager(g);
    tick(fm, 3);
    const cr = fm.critters[0];
    const tr = g.world.get(cr.id, C.Transform);
    // Cola o jogador a 2u do bicho (dentro do raio de fuga).
    const ptr = g.world.get(pid, C.Transform);
    ptr.x = tr.x - 2; ptr.z = tr.z;
    const before = Math.hypot(tr.x - ptr.x, tr.z - ptr.z);
    fm.update(0.2);
    const after = Math.hypot(g.world.get(cr.id, C.Transform).x - ptr.x, g.world.get(cr.id, C.Transform).z - ptr.z);
    expect(after).toBeGreaterThan(before);
  });

  it('recicla bichos que ficam longe do grupo', () => {
    const g = makeGame(); g.seed = 1;
    g.groupCenter = { x: 0, z: 0 };
    const fm = new FaunaManager(g);
    tick(fm, 6);
    expect(fm.critters.length).toBeGreaterThan(0);
    // Some fauna (troca de bioma para picos, longe): os da Clareira são reciclados.
    g.groupCenter = { x: 120, z: 150 }; // picos (região do Abrigo do Degelo)
    fm.update(0.1);
    const picoIds = new Set(FAUNA_BY_BIOME.picos.map((d) => d.id));
    for (const cr of fm.critters) expect(picoIds.has(cr.def.id)).toBe(true);
  });
});
