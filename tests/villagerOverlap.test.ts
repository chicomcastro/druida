import { describe, it, expect } from 'vitest';
import { World } from '../src/core/ecs/World.js';
import { C, Transform } from '../src/core/ecs/components.js';
import { SettlementManager } from '../src/world/SettlementManager.js';

/**
 * De-overlap de aldeões (E61): dois moradores no MESMO ponto (parados) eram
 * empurrados para longe? Antes ficavam "um dentro do outro" e piscavam
 * (z-fighting). O passe posicional os separa todo frame.
 */
describe('aldeões não ficam um dentro do outro (E61)', () => {
  it('_deOverlap separa moradores coincidentes', () => {
    const world = new World();
    const sm: any = Object.create(SettlementManager.prototype);
    sm.game = { world };
    const mk = (x: number, z: number) => {
      const id = world.createEntity();
      world.add(id, C.Transform, Transform(x, z));
      return { id, insideVenue: null };
    };
    // Dois exatamente no mesmo ponto + um terceiro colado.
    sm._villagers = [mk(0, 0), mk(0, 0), mk(0.2, 0.1)];

    for (let i = 0; i < 40; i++) sm._deOverlap();

    const pos = sm._villagers.map((v: any) => world.get(v.id, C.Transform));
    const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.z - b.z);
    expect(dist(pos[0], pos[1])).toBeGreaterThan(0.85);
    expect(dist(pos[0], pos[2])).toBeGreaterThan(0.85);
    expect(dist(pos[1], pos[2])).toBeGreaterThan(0.85);
  });

  it('não mexe em quem está dentro de recinto (escondido)', () => {
    const world = new World();
    const sm: any = Object.create(SettlementManager.prototype);
    sm.game = { world };
    const a = world.createEntity(); world.add(a, C.Transform, Transform(0, 0));
    const b = world.createEntity(); world.add(b, C.Transform, Transform(0, 0));
    sm._villagers = [{ id: a, insideVenue: null }, { id: b, insideVenue: 'tavern' }];
    sm._deOverlap();
    // b está escondido num recinto → não é empurrado.
    expect(world.get(b, C.Transform).x).toBe(0);
    expect(world.get(b, C.Transform).z).toBe(0);
  });
});
