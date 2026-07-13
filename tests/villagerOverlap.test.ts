import { describe, it, expect } from 'vitest';
import { World } from '../src/core/ecs/World.js';
import { C, Transform, Velocity, Collider } from '../src/core/ecs/components.js';
import { movementSystem } from '../src/systems/movement.js';

/** Ente sólido, opcionalmente marcado como jogador (E67). */
function actor(world: any, x: number, z: number, dyn = true, player = false) {
  const id = world.createEntity();
  world.add(id, C.Transform, Transform(x, z));
  if (dyn) world.add(id, C.Velocity, Velocity(0, 0, 1));
  world.add(id, C.Collider, Collider(0.55, true));
  if (player) world.add(id, C.PlayerControlled, { index: 0, downed: false });
  return id;
}

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

describe('herói imóvel para NPCs dinâmicos (E67)', () => {
  it('um NPC esbarrando NÃO arrasta o jogador — só o NPC recua', () => {
    const world = new World();
    const game: any = { world };
    const player = actor(world, 0, 0, true, true);
    const npc = actor(world, 0.4, 0, true, false); // sobreposto ao herói
    for (let i = 0; i < 30; i++) movementSystem(game, 1 / 60);
    const pt = world.get(player, C.Transform), nt = world.get(npc, C.Transform);
    // O herói não saiu da origem; o NPC foi empurrado para longe.
    expect(Math.hypot(pt.x, pt.z)).toBeLessThan(0.01);
    expect(Math.hypot(nt.x - pt.x, nt.z - pt.z)).toBeGreaterThan(1.0);
  });

  it('o jogador AINDA é bloqueado por estruturas estáticas (não atravessa parede)', () => {
    const world = new World();
    const game: any = { world };
    const player = actor(world, 0.3, 0, true, true);
    const wall = actor(world, 0, 0, false, false); // estático (sem Velocity)
    for (let i = 0; i < 30; i++) movementSystem(game, 1 / 60);
    const pt = world.get(player, C.Transform), wt = world.get(wall, C.Transform);
    // A parede não se moveu; o herói foi empurrado para fora dela.
    expect(Math.hypot(wt.x, wt.z)).toBeLessThan(0.01);
    expect(Math.hypot(pt.x - wt.x, pt.z - wt.z)).toBeGreaterThan(1.0);
  });
});
