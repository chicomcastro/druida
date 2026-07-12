import { describe, it, expect } from 'vitest';
import { makeGame } from './helpers.js';
import { C, Factions, Transform, Velocity, Health, Faction, StatusEffects } from '../src/core/ecs/components.js';
import { aiSystem } from '../src/systems/ai.js';

/**
 * Refúgio (E60): inimigos não perseguem quem está numa vila/hub. Fim do "sobe
 * de nível parado na cidade" — os bichos rondam a borda, não invadem.
 */
function spawnFoe(g: any, x: number, z: number) {
  const id = g.world.createEntity();
  g.world.add(id, C.Transform, Transform(x, z));
  g.world.add(id, C.Velocity, Velocity(0, 0, 3));
  g.world.add(id, C.Health, Health(30));
  g.world.add(id, C.Faction, Faction(Factions.ENEMY));
  g.world.add(id, C.StatusEffects, StatusEffects());
  g.world.add(id, C.AI, { behavior: 'melee', state: 'idle', aggroRange: 20, attackRange: 1.6, attackCooldown: 1.4, timer: 0, damage: 5 });
  return id;
}
function addStubPlayer(g: any, x: number, z: number) {
  const id = g.world.createEntity();
  g.world.add(id, C.Transform, Transform(x, z));
  g.world.add(id, C.PlayerControlled, { index: 0, downed: false });
  g.world.add(id, C.Health, Health(100));
  return id;
}

describe('IA: refúgio da vila (E60)', () => {
  it('inimigo NÃO persegue jogador dentro de zona segura', () => {
    const g = makeGame();
    g.settlements = { isSafe: (x: number, z: number) => Math.hypot(x, z) < 20 };
    addStubPlayer(g, 0, 0);           // jogador na vila (origem)
    const foe = spawnFoe(g, 5, 0);    // bicho a 5u, aggro 20 (alcançaria)
    aiSystem(g, 1 / 60);
    const vel = g.world.get(foe, C.Velocity);
    expect(Math.hypot(vel.vx, vel.vz)).toBe(0); // não se mexe
    expect(g.world.get(foe, C.AI).state).toBe('idle');
  });

  it('inimigo persegue jogador FORA da zona segura', () => {
    const g = makeGame();
    g.settlements = { isSafe: (x: number, z: number) => Math.hypot(x, z) < 20 };
    addStubPlayer(g, 100, 0);         // jogador no mundo aberto
    const foe = spawnFoe(g, 105, 0);
    aiSystem(g, 1 / 60);
    const vel = g.world.get(foe, C.Velocity);
    expect(Math.hypot(vel.vx, vel.vz)).toBeGreaterThan(0); // avança
  });
});
