import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { BOONS, chooseBoon, hasBoon, speedBoonMul, iframeBoonMul, registerBoonHooks } from '../src/gameplay/boons.js';
import { applyEquipment } from '../src/gameplay/equip.js';
import { BALANCE } from '../src/data/balance.js';

describe('BOONS (dados)', () => {
  it('cada forma de santuário oferece 2 dons com ids únicos', () => {
    const ids = new Set<string>();
    for (const form of ['bear', 'raven', 'frog']) {
      expect(BOONS[form].length).toBe(2);
      for (const b of BOONS[form]) {
        expect(ids.has(b.id)).toBe(false);
        ids.add(b.id);
      }
    }
  });
});

describe('chooseBoon', () => {
  it('escolha inválida/duplicada falha; válida registra e anuncia', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    expect(chooseBoon(g, 'bear', 'inexistente')).toBe(false);
    expect(chooseBoon(g, 'bear', 'casca')).toBe(true);
    expect(g.boons.bear).toBe('casca');
    expect(chooseBoon(g, 'bear', 'espinhos')).toBe(false); // permanente
    expect(g.events.some((e) => e.e === 'boonChosen')).toBe(true);
  });

  it('Casca de Carvalho: +20% de vida máxima (recalculada na hora)', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    const before = g.world.get(pid, C.Health).max;
    chooseBoon(g, 'bear', 'casca');
    expect(g.world.get(pid, C.Health).max).toBe(Math.round(before * 1.2));
  });

  it('Orvalho Eterno: +30% de regen de Seiva', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    const before = g.world.get(pid, C.Sap).regen;
    chooseBoon(g, 'frog', 'orvalho');
    expect(g.world.get(pid, C.Sap).regen).toBeCloseTo(before * 1.3);
  });

  it('Asas do Vento e Presságio: multiplicadores lidos pelos sistemas', () => {
    const g = makeGame();
    expect(speedBoonMul(g)).toBe(1);
    expect(iframeBoonMul(g)).toBe(1);
    g.boons = { raven: 'vento' };
    expect(speedBoonMul(g)).toBeCloseTo(1.1);
    g.boons = { raven: 'pressagio' };
    expect(iframeBoonMul(g)).toBeCloseTo(1.5);
    expect(hasBoon(g, 'pressagio')).toBe(true);
  });
});

describe('dons reativos (hooks)', () => {
  it('Pelagem de Espinhos reflete dano ao agressor (sem eco infinito)', () => {
    const g = makeGame();
    registerBoonHooks(g);
    const pid = addPlayer(g, 0, 0, 0);
    g.boons = { bear: 'espinhos' };
    const eid = g.spawnEnemyByKey('rotboar', 1, 0);
    const ehpBefore = g.world.get(eid, C.Health).hp;
    g.emit('damage', { id: pid, attackerId: eid, amount: 20 });
    expect(g.world.get(eid, C.Health).hp).toBeCloseTo(ehpBefore - 3); // 15% de 20
    // Dano refletido carrega o marcador e não reflete de volta.
    const reflectedEvents = g.events.filter((e) => e.e === 'damage' && e.p.reflected);
    expect(reflectedEvents.length).toBe(1);
  });

  it('Pele Úmida cura ao trocar de forma', () => {
    const g = makeGame();
    registerBoonHooks(g);
    const pid = addPlayer(g, 0, 0, 0);
    g.boons = { frog: 'pele_umida' };
    const hp = g.world.get(pid, C.Health);
    hp.hp = hp.max - 30;
    g.emit('formSwap', { id: pid, form: 'wolf' });
    expect(hp.hp).toBe(hp.max - 20);
  });
});

describe('persistência dos dons', () => {
  it('restaurar boons antes do re-equip aplica os passivos no load', () => {
    const g = makeGame();
    g.boons = { bear: 'casca' }; // como após save.apply()
    const pid = addPlayer(g, 0, 0, 0); // setupNewPlayer -> applyEquipment lê os dons
    expect(g.world.get(pid, C.Health).max).toBe(Math.round(BALANCE.player.baseHp * 1.2));
    applyEquipment(g, pid); // idempotente
    expect(g.world.get(pid, C.Health).max).toBe(Math.round(BALANCE.player.baseHp * 1.2));
  });
});
