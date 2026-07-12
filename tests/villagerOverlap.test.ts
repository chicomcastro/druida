import { describe, it, expect } from 'vitest';
import { World } from '../src/core/ecs/World.js';
import { C, Transform, Velocity, Collider } from '../src/core/ecs/components.js';
import { movementSystem } from '../src/systems/movement.js';

/**
 * Desempate de coincidentes na colisão (E62): dois entes SÓLIDOS exatamente no
 * mesmo ponto eram PULADOS pelo resolvedor (sem direção de empurrão) e ficavam
 * grudados — dois modelos iguais no mesmo lugar piscam no z-buffer (o "aldeão
 * dentro do outro"). Agora uma normal determinística os separa.
 */
function solid(world: any, x: number, z: number, dyn = true) {
  const id = world.createEntity();
  world.add(id, C.Transform, Transform(x, z));
  if (dyn) world.add(id, C.Velocity, Velocity(0, 0, 1));
  world.add(id, C.Collider, Collider(0.55, true));
  return id;
}

describe('colisão separa coincidentes (E62)', () => {
  it('dois sólidos no MESMO ponto se separam (não ficam grudados)', () => {
    const world = new World();
    const game: any = { world };
    const a = solid(world, 0, 0), b = solid(world, 0, 0);
    for (let i = 0; i < 30; i++) movementSystem(game, 1 / 60);
    const ta = world.get(a, C.Transform), tb = world.get(b, C.Transform);
    const d = Math.hypot(ta.x - tb.x, ta.z - tb.z);
    expect(d).toBeGreaterThan(1.0); // separados até ~soma dos raios (1.1)
  });

  it('sólidos próximos (sobrepostos) também se afastam', () => {
    const world = new World();
    const game: any = { world };
    const a = solid(world, 0, 0), b = solid(world, 0.2, 0.1);
    for (let i = 0; i < 30; i++) movementSystem(game, 1 / 60);
    const ta = world.get(a, C.Transform), tb = world.get(b, C.Transform);
    expect(Math.hypot(ta.x - tb.x, ta.z - tb.z)).toBeGreaterThan(1.0);
  });

  it('o desempate é determinístico (sem gerar NaN)', () => {
    const world = new World();
    const game: any = { world };
    const a = solid(world, 0, 0), b = solid(world, 0, 0);
    // A estabilidade vem da normal por id — não pode gerar NaN.
    for (let i = 0; i < 5; i++) movementSystem(game, 1 / 60);
    for (const id of [a, b]) {
      const tr = world.get(id, C.Transform);
      expect(Number.isFinite(tr.x)).toBe(true);
      expect(Number.isFinite(tr.z)).toBe(true);
    }
  });
});
