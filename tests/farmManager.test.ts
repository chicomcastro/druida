import { describe, it, expect } from 'vitest';
import { FarmManager } from '../src/world/FarmManager.js';
import { CROPS, plantPlot, harvestPlot, seedCount, plotReady } from '../src/gameplay/farming.js';
import { ingredientCount } from '../src/gameplay/ingredients.js';
import { C } from '../src/core/ecs/components.js';

/** Stub mínimo de game/world para exercitar o FarmManager sem render real. */
function stubGame(): any {
  const comps = new Map<number, Map<any, any>>();
  let nid = 0;
  return {
    seed: 7,
    progress: {},
    inDungeon: false,
    emit() {},
    settlements: { list: [{ theme: 'druida', id: 'circulo_carvalho', x: 0, z: 0 }] },
    renderer: { add() {} },
    world: {
      createEntity() { const id = ++nid; comps.set(id, new Map()); return id; },
      add(id: number, c: any, v: any) { comps.get(id)!.set(c, v); },
      get(id: number, c: any) { return comps.get(id)?.get(c); },
    },
  };
}

describe('FarmManager — canteiros da vila (E20.2)', () => {
  it('cria 2 canteiros interativos na Clareira e dá sementes iniciais', () => {
    const g = stubGame();
    const fm = new FarmManager(g);
    expect(fm.plots.length).toBe(2);
    for (const p of fm.plots) {
      const inter = g.world.get(p.eid, C.Interactable);
      expect(inter.kind).toBe('plot');
      expect(inter.plotId).toBe(p.id);
    }
    expect(seedCount(g, 'erva')).toBeGreaterThan(0); // starter
  });

  it('plantar mostra o broto; maduro mostra o fruto e o prompt de colher', () => {
    const g = stubGame();
    const fm = new FarmManager(g);
    const p = fm.plots[0];
    expect(plantPlot(g, p.id, 'erva')).toBe(true);
    fm.update(0);
    expect(p.sprout.visible).toBe(true);
    expect(p.fruit.visible).toBe(false);
    // Cresce até maduro.
    fm.update(CROPS.erva.growTime);
    expect(plotReady(g, p.id)).toBe(true);
    expect(p.fruit.visible).toBe(true);
    const inter = g.world.get(p.eid, C.Interactable);
    expect(inter.prompt).toContain('Colher');
    // Colher credita a despensa e limpa o canteiro.
    const before = ingredientCount(g, 'erva');
    harvestPlot(g, p.id);
    expect(ingredientCount(g, 'erva')).toBe(before + CROPS.erva.yieldQty);
    fm.update(0);
    expect(p.sprout.visible).toBe(false);
  });

  it('cresce mesmo fora da vila (em masmorra/interior)', () => {
    const g = stubGame();
    const fm = new FarmManager(g);
    const p = fm.plots[0];
    plantPlot(g, p.id, 'erva');
    g.inDungeon = true;
    fm.update(CROPS.erva.growTime);
    expect(plotReady(g, p.id)).toBe(true);
  });
});
