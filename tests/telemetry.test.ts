import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { Telemetry } from '../src/gameplay/telemetry.js';
import { promoteToElite } from '../src/gameplay/spawn.js';

describe('Telemetria local (ADR 0051)', () => {
  it('conta eventos de jogo (kills, elites, quedas, essência, história)', () => {
    const g = makeGame();
    const t = new Telemetry(g);
    g.telemetry = t;
    addPlayer(g, 0, 0, 0);
    const eid = g.spawnEnemyByKey('rotboar', 5, 0);
    promoteToElite(g, eid, 'veloz');

    g.emit('kill', { id: eid, x: 0, z: 0 });
    g.emit('kill', { id: 999, x: 0, z: 0, bossName: 'O Apodrecedor' });
    g.emit('playerDowned', {});
    g.emit('essence', { amount: 12 });
    g.emit('itemPickup', {});
    g.emit('questCompleted', {});
    g.emit('boonChosen', {});
    g.emit('storyStep', { step: 4 });
    g.emit('storyStep', { step: 2 }); // não regride
    g.emit('victory', {});

    expect(t.data.kills).toBe(2);
    expect(t.data.eliteKills).toBe(1);
    expect(t.data.bossKills).toBe(1);
    expect(t.data.downs).toBe(1);
    expect(t.data.essenceEarned).toBe(12);
    expect(t.data.itemsPicked).toBe(1);
    expect(t.data.questsCompleted).toBe(1);
    expect(t.data.boonsChosen).toBe(1);
    expect(t.data.maxStoryStep).toBe(4);
    expect(t.data.victories).toBe(1);
    expect(t.data.sessions).toBe(1);
  });

  it('separa dano dado e dano tomado', () => {
    const g = makeGame();
    const t = new Telemetry(g);
    const pid = addPlayer(g, 0, 0, 0);
    const eid = g.spawnEnemyByKey('rotboar', 5, 0);
    g.emit('damage', { id: pid, amount: 10 });
    g.emit('damage', { id: eid, amount: 25 });
    expect(t.data.damageTaken).toBe(10);
    expect(t.data.damageDealt).toBe(25);
  });

  it('acumula tempo de jogo e exporta JSON legível', () => {
    const g = makeGame();
    const t = new Telemetry(g);
    for (let i = 0; i < 100; i++) t.update(0.1);
    expect(t.data.playSeconds).toBeCloseTo(10, 1);
    const out = JSON.parse(t.export());
    expect(out.playSeconds).toBe(10);
    expect(out.v).toBe(1);
  });

  it('desligada, não coleta nada', () => {
    const g = makeGame();
    const t = new Telemetry(g);
    t.setEnabled(false);
    g.emit('kill', { id: 1, x: 0, z: 0 });
    t.update(5);
    expect(t.data.kills).toBe(0);
    expect(t.data.playSeconds).toBe(0);
  });
});
