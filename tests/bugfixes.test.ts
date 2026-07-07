import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { InteriorManager } from '../src/world/InteriorManager.js';
import { playerControlSystem } from '../src/systems/playerControl.js';
import { C } from '../src/core/ecs/components.js';

/**
 * Correções do playtest (ADR 0162).
 */
describe('Bugs do playtest (ADR 0162)', () => {
  it('o jogador começa só com o humanoide — Lobo vem do santuário', () => {
    const g = makeGame();
    const id = addPlayer(g, 0, 0, 0);
    expect(g.world.get(id, C.Form).list).toEqual(['humanoid']);
  });

  it('golpe no ar não acumula proficiência (só ao acertar)', () => {
    const g = makeGame();
    const id = addPlayer(g, 0, 0, 0);
    const intent = g.world.get(id, C.Intent);
    intent.attack = true;
    playerControlSystem(g, 0.016); // ataca sem nenhum alvo por perto
    const prof = g.progress.proficiency ?? {};
    expect(Object.values(prof).reduce((a: number, b: any) => a + b, 0)).toBe(0);
  });

  it('as paredes do interior não enchem a sala (colisores pequenos)', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    im._buildRoom();
    const solid = [...g.world.query(C.Transform, C.Collider)].filter(([, , c]: any) => c.solid);
    expect(solid.length).toBeGreaterThan(0);
    // Nenhum colisor gigante (o bug tinha raio = ROOM_R = 8, enchia a sala).
    for (const [, , c] of solid as any) expect(c.radius).toBeLessThanOrEqual(1);
  });
});
