import { describe, it, expect } from 'vitest';
import { makeGame } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { LandmarkManager } from '../src/world/LandmarkManager.js';
import { LANDMARK_TYPES } from '../src/data/landmarks.js';

// Cria uma entidade "inimigo" fake com a espécie marcada no Renderable (E37).
function fakeFoe(g: any, kind: string) {
  const id = g.world.createEntity();
  g.world.add(id, C.Transform, { x: 0, z: 0, rot: 0 });
  g.world.add(id, C.Renderable, { object3d: { position: { set() {} } }, kind });
  return id;
}

describe('Ermos — spots, eremitas e caçadas (E37)', () => {
  it('gera spots determinísticos, um por anel, com cenário/eremita/alvo', () => {
    const g = makeGame();
    const lm = new LandmarkManager(g);
    expect(lm.spots.length).toBe(5); // um por anel; cobre os 5 tipos de cenário
    expect(new Set(lm.spots.map((s: any) => s.type.scenery)).size).toBe(5);
    for (const s of lm.spots) {
      expect(s.type.scenery).toBeTruthy();
      expect(typeof s.foe).toBe('string'); // alvo de caçada derivado do bioma
      expect(Math.hypot(s.x, s.z)).toBeGreaterThan(20); // fora do centro/vilas
    }
    // Determinismo: mesma semente → mesmas posições.
    const lm2 = new LandmarkManager(makeGame());
    expect(lm2.spots.map((s: any) => [Math.round(s.x), Math.round(s.z)]))
      .toEqual(lm.spots.map((s: any) => [Math.round(s.x), Math.round(s.z)]));
  });

  it('spots com eremita ganham um NPC interativo (kind hermit)', () => {
    const g = makeGame();
    const lm = new LandmarkManager(g);
    const withHermit = lm.spots.filter((s: any) => s.type.hermit);
    expect(withHermit.length).toBeGreaterThan(0);
    for (const s of withHermit) {
      const inter = g.world.get(s.hermitId, C.Interactable);
      expect(inter.kind).toBe('hermit');
      expect(inter.spotId).toBe(s.id);
    }
  });

  it('a caçada ativa ao falar, conta só o alvo e completa com recompensa', () => {
    const g = makeGame();
    const lm = new LandmarkManager(g);
    const spot = lm.spots.find((s: any) => s.type.bounty);
    expect(spot).toBeTruthy();
    const n = spot.type.bounty.count;
    lm.talk(spot.id);
    expect(spot.active).toBe(true);
    // Matar OUTRA espécie não conta.
    g.emit('kill', { id: fakeFoe(g, spot.foe === 'rotboar' ? 'husk' : 'rotboar') });
    expect(spot.kills).toBe(0);
    // Matar o alvo N vezes completa a caçada.
    for (let i = 0; i < n; i++) g.emit('kill', { id: fakeFoe(g, spot.foe) });
    expect(lm.done.has(spot.id)).toBe(true);
    expect(spot.active).toBe(false);
    expect(g.events.some((e: any) => e.e === 'questCompleted' && e.p.id === `bounty:${spot.id}`)).toBe(true);
    // Recompensa largada no mundo (orbs de loot) — item único + essência.
    const orbs = [...g.world.query(C.Pickup)] as any[];
    expect(orbs.length).toBeGreaterThanOrEqual(2);
    expect(orbs.some(([, p]: any) => p.item?.name === spot.type.bounty.reward.name)).toBe(true);
  });

  it('caçada já concluída não reativa; persiste no save', () => {
    const g = makeGame();
    const lm = new LandmarkManager(g);
    const spot = lm.spots.find((s: any) => s.type.bounty);
    lm.done.add(spot.id);
    lm.talk(spot.id);
    expect(spot.active).toBe(false); // não reabre
    const data = lm.serialize();
    expect(data.done).toContain(spot.id);
    const lm2 = new LandmarkManager(makeGame());
    lm2.restore(data);
    expect(lm2.done.has(spot.id)).toBe(true);
  });

  it('todo tipo de landmark tem cenário e placa (sabor de mundo)', () => {
    for (const t of LANDMARK_TYPES) {
      expect(t.scenery).toBeTruthy();
      expect(t.sign.length).toBeGreaterThan(0);
    }
  });
});
