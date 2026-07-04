import { describe, it, expect } from 'vitest';
import { TerrainFeatures } from '../src/world/TerrainFeatures.js';

function stubGame(over: any = {}) {
  const entities: any[] = [];
  return {
    seed: 1337,
    renderer: { add: () => {} },
    settlements: { isSafe: () => false },
    world: {
      createEntity: () => entities.push({}) - 0,
      add: (id: number, kind: string) => { if (kind === 'Collider') entities[entities.length - 1].col = true; },
      _entities: entities,
    },
    ...over,
  };
}

// O componente C.Collider resolve para uma string no stub — o que importa
// aqui é a contagem de aglomerados/colliders e o determinismo pela seed.
describe('TerrainFeatures (ADR 0064)', () => {
  it('cria afloramentos instanciados nas fronteiras com colliders', () => {
    const game = stubGame();
    const t = new TerrainFeatures(game);
    expect(t.inst).not.toBeNull();
    expect((t.inst as any).count).toBeGreaterThan(200); // blocos nas 3 fronteiras
    expect(game.world._entities.length).toBeGreaterThan(60); // 1 collider por aglomerado
  });

  it('é determinístico pela seed e respeita as zonas seguras', () => {
    const a = new TerrainFeatures(stubGame());
    const b = new TerrainFeatures(stubGame());
    expect((a.inst as any).count).toBe((b.inst as any).count);
    const c = new TerrainFeatures(stubGame({ seed: 42 }));
    expect((c.inst as any).count).not.toBe((a.inst as any).count);
    // Tudo é zona segura: nenhuma falésia nasce.
    const blocked = new TerrainFeatures(stubGame({ settlements: { isSafe: () => true } }));
    expect(blocked.inst).toBeNull();
  });
});
