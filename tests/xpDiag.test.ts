import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C, Factions } from '../src/core/ecs/components.js';
import { bindGameEvents } from '../src/core/gameEvents.js';
import { meleeArc } from '../src/gameplay/combat.js';
import { FaunaManager } from '../src/world/FaunaManager.js';

/**
 * Diagnóstico de XP (E61): toda concessão de XP registra a fonte em `_xpLog`,
 * para depurar o "sobe de nível sem inimigo". Também re-tranca: matar fauna não
 * dá XP nem entra no log.
 */
describe('diagnóstico de XP (E61)', () => {
  it('matar inimigo registra a fonte no _xpLog', () => {
    const g = makeGame();
    bindGameEvents(g);
    const id = g.spawnEnemyByKey('husk', 3, 0); // cria inimigo real (LootTable.xp)
    g.emit('kill', { id, x: 3, z: 0, loot: g.world.get(id, C.LootTable) });
    expect(g._xpLog.length).toBe(1);
    expect(g._xpLog[0].kind).toBe('husk');
    expect(g._xpLog[0].team).toBe(Factions.ENEMY);
    expect(g._xpLog[0].xp).toBeGreaterThan(0);
    expect(g.progress.xp).toBeGreaterThan(0);
  });

  it('matar fauna NÃO dá XP nem entra no log', () => {
    const g = makeGame();
    g.seed = 1;
    bindGameEvents(g);
    g.fauna = new FaunaManager(g);
    const pid = addPlayer(g);
    const fid = g.world.createEntity();
    g.world.add(fid, C.Transform, { x: 0, z: 1.2, rot: 0 });
    g.world.add(fid, C.Health, { hp: 6, max: 6, dead: false, invuln: 0 });
    g.world.add(fid, C.Faction, { team: Factions.NEUTRAL });
    g.world.add(fid, C.Collider, { radius: 0.4, solid: false });
    g.world.add(fid, C.Tint, { flash: 0, react: 0 });
    g.fauna.critters.push({ id: fid, def: { drops: { carne_crua: 1 } }, obj: { position: { x: 0, y: 0, z: 1.2 } }, target: null, wait: 0, phase: 0 });
    meleeArc(g, pid, { angle: 0, range: 2.5, arc: 1.2, damage: 50, team: Factions.PLAYER });
    expect(g.progress.xp).toBe(0);
    expect(g._xpLog ?? []).toHaveLength(0);
  });
});
