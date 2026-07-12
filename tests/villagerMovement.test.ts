import { describe, it, expect } from 'vitest';
import { makeGame } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { SettlementManager } from '../src/world/SettlementManager.js';
import { movementSystem } from '../src/systems/movement.js';

/**
 * Movimento dos aldeões na Clareira (E64): valida o que o playtest reclamou —
 * (1) conseguem circular para os DOIS lados da Carvalho-Mãe (inclusive x local
 * NEGATIVO, "à esquerda"), não ficam presos num lado; (2) não acabam DENTRO do
 * tronco da árvore-mãe (colisor sólido). Roda o SettlementManager real +
 * movementSystem (integra velocidade e resolve colisão) sem jogador por perto.
 */
describe('aldeões circulam a Carvalho-Mãe (E64)', () => {
  it('exploram os dois lados (x local ±) e não entram no tronco', () => {
    const game: any = makeGame();
    game.dayNight = { time: 0.35 }; // dia: povo passeia/trabalha
    const sm = new SettlementManager(game);

    // Aldeões da Clareira (tema druida) e o centro da vila.
    const clareira = sm.list.find((s: any) => s.theme === 'druida');
    expect(clareira).toBeTruthy();
    const cx = clareira.x, cz = clareira.z;
    const locals = sm._villagers.filter((v: any) => v.theme === 'druida');
    expect(locals.length).toBeGreaterThan(3);

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    let insideTrunk = 0, samples = 0, reversals = 0, moving = 0;
    const prevDir = new Map<number, { x: number; z: number }>();
    for (let step = 0; step < 60 * 40; step++) { // ~40s @60fps
      sm.update(1 / 60);
      movementSystem(game, 1 / 60);
      for (const v of locals) {
        if (v.insideVenue) continue; // escondido num recinto: não conta
        const tr = game.world.get(v.id, C.Transform);
        const vel = game.world.get(v.id, C.Velocity);
        if (!tr || !vel) continue;
        const lx = tr.x - cx, lz = tr.z - cz;
        minX = Math.min(minX, lx); maxX = Math.max(maxX, lx);
        minZ = Math.min(minZ, lz); maxZ = Math.max(maxZ, lz);
        samples++;
        if (Math.abs(lx) < 1.6 && Math.abs(lz) < 1.6) insideTrunk++; // dentro da pegada 3.4²
        // Jitter: mede inversões bruscas de direção (>90°) entre frames andando.
        const sp = Math.hypot(vel.vx, vel.vz);
        if (sp > 0.2) {
          const dir = { x: vel.vx / sp, z: vel.vz / sp };
          const p = prevDir.get(v.id);
          if (p) { moving++; if (dir.x * p.x + dir.z * p.z < 0) reversals++; }
          prevDir.set(v.id, dir);
        } else { prevDir.delete(v.id); }
      }
    }

    // Circulam para AMBOS os lados no eixo x (o "esquerda" = x negativo).
    expect(maxX).toBeGreaterThan(6);
    expect(minX).toBeLessThan(-6);
    // E também nos dois sentidos de z (norte/sul).
    expect(maxZ).toBeGreaterThan(6);
    expect(minZ).toBeLessThan(-6);
    // Quase nunca dentro do tronco (colisor sólido os mantém fora).
    expect(insideTrunk / Math.max(1, samples)).toBeLessThan(0.02);
    // Sem jitter: inversões bruscas de direção são raras (< 3% dos frames andando).
    expect(reversals / Math.max(1, moving)).toBeLessThan(0.03);
  });
});
