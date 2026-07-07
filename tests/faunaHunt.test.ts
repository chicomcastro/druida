import { describe, it, expect } from 'vitest';
import { makeGame } from './helpers.js';
import { FaunaManager } from '../src/world/FaunaManager.js';
import { meleeArc } from '../src/gameplay/combat.js';
import { C, Transform, Health, Faction, Factions } from '../src/core/ecs/components.js';
import { FAUNA_BY_BIOME } from '../src/data/fauna.js';

/**
 * Caça de ponta a ponta (ADR 0157): o ataque do jogador acerta o bicho caçável
 * (facção neutra ≠ jogador), ele morre e **solta os ingredientes da espécie** —
 * validando a fonte de carne/sebo vinda dos animais, não só dos monstros.
 */
describe('Caçar fauna solta ingredientes (ADR 0157)', () => {
  it('abater um cervo dropa carne + sebo e remove o bicho', () => {
    const game: any = makeGame();
    game.fauna = new FaunaManager(game);
    const cervo = FAUNA_BY_BIOME.clareira.find((f) => f.id === 'cervo')!;
    game.fauna._spawn(cervo, 0, 0);
    expect(game.fauna.critters.length).toBe(1);

    const cr = game.fauna.critters[0];
    const tr = game.world.get(cr.id, C.Transform);

    // Jogador colado no bicho, golpe forte num arco amplo.
    const pid = game.world.createEntity();
    game.world.add(pid, C.Transform, Transform(tr.x - 1, tr.z));
    game.world.add(pid, C.Faction, Faction(Factions.PLAYER));
    game.world.add(pid, C.Health, Health(100));
    const hits = meleeArc(game, pid, { angle: Math.PI / 2, range: 4, arc: Math.PI, damage: 100, team: Factions.PLAYER });

    expect(hits).toBe(1);
    expect(game.fauna.critters.length).toBe(0); // bicho abatido saiu do passeio
    const drops = [...game.world.query(C.Pickup)].map(([, p]: any) => p.item.ingredient);
    expect(drops).toContain('carne_crua');
    expect(drops).toContain('sebo');
  });

  it('libélula (sem drops) não é caçável: sem vida, o golpe não a atinge', () => {
    const game: any = makeGame();
    game.fauna = new FaunaManager(game);
    const libelula = FAUNA_BY_BIOME.pantano.find((f) => f.id === 'libelula')!;
    game.fauna._spawn(libelula, 0, 0);
    const cr = game.fauna.critters[0];
    expect(game.world.get(cr.id, C.Health)).toBeUndefined();
  });
});
