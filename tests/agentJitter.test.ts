import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { aiSystem } from '../src/systems/ai.js';
import { movementSystem } from '../src/systems/movement.js';
import { C } from '../src/core/ecs/components.js';

/**
 * Auditoria de jitter dos agentes que se movem (E48). O bug do E46 (aldeões/fauna
 * vibrando pra frente/trás) vinha das FORÇAS de steering (desvio/rua/separação)
 * se invertendo 180° na borda de uma estrutura. Os inimigos/chefes/invocações NÃO
 * usam esse steering — só perseguem (melee) ou mantêm distância com uma banda
 * morta (ranged) —, então não têm essa oscilação. Estes testes travam isso: se um
 * dia alguém der steering aos inimigos sem suavizar, o jitter reaparece e cai aqui.
 *
 * Métrica: reversões da DIREÇÃO do deslocamento por frame (a colisão mexe em
 * `Transform` direto, então medimos o delta de posição, não a velocidade).
 */
function countReversals(game: any, ids: number[], steps: number, movePlayer?: (i: number) => void) {
  const st = new Map<number, { px: number | null; pz: number; pdx: number; pdz: number; rev: number }>();
  for (const id of ids) st.set(id, { px: null, pz: 0, pdx: 0, pdz: 0, rev: 0 });
  for (let i = 0; i < steps; i++) {
    movePlayer?.(i);
    aiSystem(game, 1 / 60);
    movementSystem(game, 1 / 60);
    for (const id of ids) {
      const tr = game.world.get(id, C.Transform); if (!tr) continue;
      const t = st.get(id)!;
      if (t.px != null) {
        const dx = tr.x - t.px, dz = tr.z - t.pz, sp = Math.hypot(dx, dz);
        if (sp > 0.003) {
          const dot = dx * t.pdx + dz * t.pdz, pp = Math.hypot(t.pdx, t.pdz);
          if (pp > 0.003 && dot < -0.3 * sp * pp) t.rev += 1;
          t.pdx = dx; t.pdz = dz;
        }
      }
      t.px = tr.x; t.pz = tr.z;
    }
  }
  return Math.max(0, ...[...st.values()].map((t) => t.rev));
}

describe('Jitter dos agentes móveis (E48)', () => {
  it('um pack de melee colado no jogador parado não vibra', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    const ids: number[] = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ids.push(g.spawnEnemyByKey('rotboar', Math.cos(a) * 1.6, Math.sin(a) * 1.6)); }
    expect(countReversals(g, ids, 600)).toBeLessThan(10);
  });

  it('um pack MISTO perseguindo um jogador em movimento não vibra', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    const ptr = g.world.get(pid, C.Transform);
    const ids = ['rotboar', 'husk', 'shadecrow', 'frostfang', 'bogbrute', 'shaman']
      .map((k, i) => g.spawnEnemyByKey(k, Math.cos(i) * 4, Math.sin(i) * 4));
    // jogador circula: força a IA a reajustar o rumo o tempo todo.
    const worst = countReversals(g, ids, 900, (i) => { ptr.x = Math.cos(i * 0.03) * 5; ptr.z = Math.sin(i * 0.03) * 5; });
    expect(worst).toBeLessThan(20); // sem oscilação (o bug do E46 dava 500+)
  });
});
