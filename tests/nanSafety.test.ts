import { describe, it, expect } from 'vitest';
import { World } from '../src/core/ecs/World.js';
import { C, Factions, Transform, Velocity, Health, Faction, Collider } from '../src/core/ecs/components.js';
import { makeGame, addPlayer } from './helpers.js';
import { bindGameEvents } from '../src/core/gameEvents.js';
import { meleeArc } from '../src/gameplay/combat.js';
import { movementSystem } from '../src/systems/movement.js';
import { normalize } from '../src/utils/math.js';

/**
 * Segurança contra NaN (E64): um inimigo em posição NaN,NaN quebrava todas as
 * guardas do meleeArc (comparação com NaN é sempre false), então era acertado
 * por TODO golpe em qualquer direção → XP "sem inimigo". Aqui garantimos que
 * fantasmas NaN não são atingidos, que a física os limpa, e que `normalize` não
 * propaga NaN.
 */
describe('segurança contra NaN (E64)', () => {
  it('normalize(NaN) não propaga NaN', () => {
    const n = normalize(NaN, NaN);
    expect(n.x).toBe(0); expect(n.z).toBe(0); expect(n.len).toBe(0);
  });

  it('inimigo em NaN,NaN NÃO é atingido pelo golpe (sem XP fantasma)', () => {
    const g: any = makeGame();
    bindGameEvents(g);
    const pid = addPlayer(g, 0, 0, 0);
    const ghost = g.world.createEntity();
    g.world.add(ghost, C.Transform, { x: NaN, z: NaN, rot: 0 });
    g.world.add(ghost, C.Health, { hp: 5, max: 5, dead: false, invuln: 0 });
    g.world.add(ghost, C.Faction, { team: Factions.ENEMY });
    g.world.add(ghost, C.LootTable, { xp: 6 });
    const hits = meleeArc(g, pid, { angle: 0, range: 2, arc: 0.8, damage: 99, team: Factions.PLAYER });
    expect(hits).toBe(0);
    expect(g.world.get(ghost, C.Health).hp).toBe(5); // ileso
    expect(g.progress.xp).toBe(0);                    // sem XP fantasma
  });

  it('velocidade NaN é zerada (não corrompe a posição) e o ente sobrevive', () => {
    const world = new World();
    const game: any = { world };
    const foe = world.createEntity();
    world.add(foe, C.Transform, Transform(3, 0));
    world.add(foe, C.Velocity, { vx: NaN, vz: 0, speed: 2 });
    world.add(foe, C.Collider, Collider(0.5, true));
    movementSystem(game, 1 / 60);
    expect(world.entities.has(foe)).toBe(true);          // continua vivo
    expect(world.get(foe, C.Transform).x).toBe(3);       // posição intacta
    expect(world.get(foe, C.Velocity).vx).toBe(0);       // velocidade saneada
  });

  it('Transform já NaN: fantasma é removido; herói é recuperado na origem', () => {
    const world = new World();
    const game: any = { world };
    const ghost = world.createEntity();
    world.add(ghost, C.Transform, { x: NaN, z: NaN, rot: 0 });
    world.add(ghost, C.Velocity, Velocity(0, 0, 2));
    const p = world.createEntity();
    world.add(p, C.Transform, { x: NaN, z: NaN, rot: 0 });
    world.add(p, C.Velocity, Velocity(0, 0, 6));
    world.add(p, C.PlayerControlled, { index: 0, downed: false });

    movementSystem(game, 1 / 60);
    world.flushDestroyed(); // o Game aplica as remoções uma vez por frame

    expect(world.entities.has(ghost)).toBe(false); // fantasma removido
    const pt = world.get(p, C.Transform);
    expect(pt.x).toBe(0); expect(pt.z).toBe(0);    // herói recuperado
  });
});
