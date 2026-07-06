import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { SideQuestManager } from '../src/gameplay/sidequests.js';
import { revealLore } from '../src/data/lore.js';
import { SIDE_QUESTS } from '../src/data/sidequests.js';

function essenceOf(g, pid) {
  return g.world.get(pid, C.Inventory).essence;
}

describe('Side quests por triggers (ADR 0096)', () => {
  it('começam travadas e não avançam com NPC errado', () => {
    const g = makeGame();
    const sq = new SideQuestManager(g);
    expect(sq.states.feud.status).toBe('locked');
    g.emit('talkedNpc', { npc: 'weapons' }); // sem estar ativa: nada acontece
    expect(sq.states.feud.status).toBe('locked');
  });

  it('feud: desbloqueia ao descobrir o segredo e completa pela cadeia de NPCs', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0);
    const sq = new SideQuestManager(g);
    const e0 = essenceOf(g, pid);
    revealLore(g, 'l14'); // segredo → dispara loreFound
    expect(sq.states.feud.status).toBe('active');
    g.emit('talkedNpc', { npc: 'weapons' });
    expect(sq.states.feud.step).toBe(1);
    g.emit('talkedNpc', { npc: 'armor' });
    expect(sq.states.feud.step).toBe(2);
    g.emit('talkedNpc', { npc: 'leader' });
    expect(sq.states.feud.status).toBe('done');
    expect(essenceOf(g, pid)).toBe(e0 + 60);
    expect(g.lore.found.has('l15')).toBe(true); // recompensa de codex
    expect(g.events.some((e) => e.e === 'questCompleted' && e.p.id === 'feud')).toBe(true);
  });

  it('passo não avança fora de ordem', () => {
    const g = makeGame();
    addPlayer(g, 0);
    const sq = new SideQuestManager(g);
    revealLore(g, 'l14');
    g.emit('talkedNpc', { npc: 'leader' }); // pulou Brida/Orin
    expect(sq.states.feud.step).toBe(0);
  });

  it('shapeshifter: desbloqueia ao despertar qualquer forma', () => {
    const g = makeGame();
    addPlayer(g, 0);
    const sq = new SideQuestManager(g);
    expect(sq.states.shapeshifter.status).toBe('locked');
    g.emit('formUnlocked', { form: 'wolf' });
    expect(sq.states.shapeshifter.status).toBe('active');
    g.emit('talkedNpc', { npc: 'hall' });
    expect(sq.states.shapeshifter.status).toBe('done');
    expect(g.lore.found.has('l3')).toBe(true);
  });

  it('wanderer: desbloqueia ao visitar 2 assentamentos', () => {
    const g = makeGame();
    addPlayer(g, 0);
    const sq = new SideQuestManager(g);
    g.emit('settlementEntered', { id: 'clareira' });
    expect(sq.states.wanderer.status).toBe('locked');
    g.emit('settlementEntered', { id: 'vau' });
    expect(sq.states.wanderer.status).toBe('active');
    g.emit('talkedNpc', { npc: 'tavern' });
    expect(sq.states.wanderer.status).toBe('done');
  });

  it('activeList reflete o passo atual', () => {
    const g = makeGame();
    addPlayer(g, 0);
    const sq = new SideQuestManager(g);
    revealLore(g, 'l14');
    const active = sq.activeList();
    expect(active.find((q) => q.id === 'feud')?.desc).toBe(SIDE_QUESTS[0].steps[0].desc);
  });

  it('feuds das vilas 2–4: desbloqueiam pelo segredo e completam pelos dois NPCs', () => {
    const cases = [
      { id: 'feud_vau', lore: 'l17', a: 'vau_arpo', b: 'vau_couro', essence: 55 },
      { id: 'feud_cinza', lore: 'l19', a: 'cinza_serra', b: 'cinza_forno', essence: 60 },
      { id: 'feud_degelo', lore: 'l21', a: 'degelo_pasto', b: 'degelo_trilha', essence: 65 },
    ];
    for (const c of cases) {
      const g = makeGame();
      const pid = addPlayer(g, 0);
      const sq = new SideQuestManager(g);
      const e0 = essenceOf(g, pid);
      expect(sq.states[c.id].status).toBe('locked');
      revealLore(g, c.lore);
      expect(sq.states[c.id].status).toBe('active');
      g.emit('talkedNpc', { npc: c.a });
      expect(sq.states[c.id].step).toBe(1);
      g.emit('talkedNpc', { npc: c.b });
      expect(sq.states[c.id].status).toBe('done');
      expect(essenceOf(g, pid)).toBe(e0 + c.essence);
      expect(g.events.some((e) => e.e === 'questCompleted' && e.p.id === c.id)).toBe(true);
    }
  });

  it('serialize/restore preserva estado e gatilhos', () => {
    const g = makeGame();
    addPlayer(g, 0);
    const sq = new SideQuestManager(g);
    revealLore(g, 'l14');
    g.emit('talkedNpc', { npc: 'weapons' });
    const snap = sq.serialize();

    const g2 = makeGame();
    addPlayer(g2, 0);
    g2.lore.found.add('l14');
    const sq2 = new SideQuestManager(g2);
    sq2.restore(snap);
    expect(sq2.states.feud.status).toBe('active');
    expect(sq2.states.feud.step).toBe(1);
    // Continua de onde parou.
    g2.emit('talkedNpc', { npc: 'armor' });
    expect(sq2.states.feud.step).toBe(2);
  });
});
