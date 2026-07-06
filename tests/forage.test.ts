import { describe, it, expect } from 'vitest';
import { ForageManager } from '../src/world/ForageManager.js';
import { ingredientCount } from '../src/gameplay/ingredients.js';
import { C } from '../src/core/ecs/components.js';

/** Stub mínimo de game/world para exercitar o ForageManager sem render real. */
function stubGame(): any {
  const comps = new Map<number, Map<any, any>>();
  let nid = 0;
  return {
    seed: 42,
    progress: {},
    emit() {},
    settlements: { isSafe: () => false }, // nunca "seguro" → todos os pontos valem
    renderer: { add() {} },
    world: {
      createEntity() { const id = ++nid; comps.set(id, new Map()); return id; },
      add(id: number, c: any, v: any) { comps.get(id)!.set(c, v); },
      get(id: number, c: any) { return comps.get(id)?.get(c); },
    },
  };
}

describe('Forrageamento (ADR 0137, E19.3)', () => {
  it('espalha nós com ingredientes forrageáveis válidos', () => {
    const g = stubGame();
    const fm = new ForageManager(g);
    expect(fm.nodes.length).toBeGreaterThan(0);
    for (const node of fm.nodes) {
      expect(node.def.source).toBe('forage');
      const inter = g.world.get(node.eid, C.Interactable);
      expect(inter.kind).toBe('forage');
      expect(inter.ingredient).toBe(node.def.id);
    }
  });

  it('colher adiciona 1 à despensa e marca o nó como usado (sem duplicar)', () => {
    const g = stubGame();
    const fm = new ForageManager(g);
    const node = fm.nodes[0];
    const before = ingredientCount(g, node.def.id);
    fm.collect(node.eid);
    expect(ingredientCount(g, node.def.id)).toBe(before + 1);
    expect(g.world.get(node.eid, C.Interactable).used).toBe(true);
    fm.collect(node.eid); // já colhido → não adiciona de novo
    expect(ingredientCount(g, node.def.id)).toBe(before + 1);
  });

  it('respawn libera o nó de novo após o tempo', () => {
    const g = stubGame();
    const fm = new ForageManager(g);
    const node = fm.nodes[0];
    fm.collect(node.eid);
    expect(node.respawn).toBeGreaterThan(0);
    fm.update(node.respawn + 1);
    expect(g.world.get(node.eid, C.Interactable).used).toBe(false);
    expect(node.mesh.visible).toBe(true);
  });
});
