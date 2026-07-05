import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { QuestManager } from '../src/gameplay/quests.js';
import { SETTLEMENTS } from '../src/data/settlements.js';
import { ABILITIES } from '../src/gameplay/abilities/index.js';
import { pickupSystem } from '../src/systems/pickups.js';

const questOf = (kind) => {
  for (const s of SETTLEMENTS) if (s.quest?.kind === kind) return { s, q: s.quest };
  throw new Error('quest não encontrada: ' + kind);
};
const interFor = (q, lines = ['fala normal']) => ({ kind: 'quest_giver', questId: q.id, lines });

describe('dados das missões de vila', () => {
  it('cada vila (fora o hub) tem missão válida com recompensa real', () => {
    const withQuest = SETTLEMENTS.filter((s) => s.quest);
    expect(withQuest.length).toBeGreaterThanOrEqual(3);
    for (const s of withQuest) {
      expect(s.quest!.count).toBeGreaterThan(0);
      expect(s.quest!.offer.length).toBeGreaterThan(0);
      expect(ABILITIES[s.quest!.reward.ability], s.quest!.id).toBeTruthy();
      expect(s.merchant).toBeTruthy(); // mercador regional junto
    }
  });
});

describe('QuestManager', () => {
  it('coleta: aceitar spawna orbes; coletar progride e completa com recompensa', () => {
    const g = makeGame();
    const qm = new QuestManager(g);
    g.quests = qm;
    const pid = addPlayer(g, 0, 0, 0);
    const { q } = questOf('collect');

    qm.onTalk(interFor(q)); // aceita
    expect(qm.states[q.id].status).toBe('active');
    const orbs = [...g.world.query(C.Pickup, C.Transform)].filter(([, p]: any) => p.item?.questItem === q.id);
    expect(orbs.length).toBe(q.count);

    // Coleta via pickupSystem (encostando em cada orbe).
    const ptr = g.world.get(pid, C.Transform);
    for (const [, , otr] of orbs as any) {
      ptr.x = otr.x; ptr.z = otr.z;
      pickupSystem(g, 0.016);
    }
    expect(qm.states[q.id].progress).toBe(q.count);

    const itemsBefore = g.world.get(pid, C.Inventory).items.length;
    const essBefore = g.world.get(pid, C.Inventory).essence;
    qm.onTalk(interFor(q)); // entrega
    expect(qm.states[q.id].status).toBe('done');
    const inv = g.world.get(pid, C.Inventory);
    expect(inv.items.length).toBe(itemsBefore + 1);
    expect(inv.items.at(-1).name).toBe(q.reward.artifactName);
    expect(inv.essence).toBe(essBefore + q.reward.essence);
    expect(g.events.some((e) => e.e === 'questCompleted')).toBe(true);

    // Depois de concluída, o ancião volta às falas normais.
    qm.onTalk(interFor(q, ['oi']));
    const lastDlg: any = g.events.filter((e) => e.e === 'dialogue').at(-1);
    expect(lastDlg.p.lines).toEqual(['oi']);
  });

  it('caça: matar os alvos marcados progride; lembrete mostra o restante', () => {
    const g = makeGame();
    const qm = new QuestManager(g);
    g.quests = qm;
    addPlayer(g, 0, 0, 0);
    const { q } = questOf('hunt');
    qm.onTalk(interFor(q));
    const st = qm.states[q.id];
    expect(st.targets.length).toBe(q.count);

    qm.onTalk(interFor(q)); // lembrete com contagem
    const dlg: any = g.events.filter((e) => e.e === 'dialogue').at(-1);
    expect(dlg.p.lines[0]).toContain(String(q.count));

    for (const id of [...st.targets]) g.emit('kill', { id, x: 0, z: 0 });
    expect(st.progress).toBe(q.count);
    // Kill de não-alvo não conta nada além.
    g.emit('kill', { id: 99999, x: 0, z: 0 });
    expect(st.progress).toBe(q.count);
  });

  it('elite: spawna um alvo elite e completa ao derrotá-lo', () => {
    const g = makeGame();
    const qm = new QuestManager(g);
    g.quests = qm;
    addPlayer(g, 0, 0, 0);
    const { q } = questOf('elite');
    qm.onTalk(interFor(q));
    const st = qm.states[q.id];
    expect(st.targets.length).toBe(1);
    expect(g.world.get(st.targets[0], C.AI).elite).toBe('petreo');
    g.emit('kill', { id: st.targets[0], x: 0, z: 0 });
    expect(st.progress).toBe(q.count);
  });

  it('persiste e restaura (ativa respawna objetivos restantes)', () => {
    const g = makeGame();
    const qm = new QuestManager(g);
    g.quests = qm;
    addPlayer(g, 0, 0, 0);
    const { q } = questOf('hunt');
    qm.onTalk(interFor(q));
    const st = qm.states[q.id];
    g.emit('kill', { id: st.targets[0], x: 0, z: 0 });
    const data = qm.serialize();
    expect(data[q.id]).toEqual({ status: 'active', progress: 1 });

    const g2 = makeGame();
    const qm2 = new QuestManager(g2);
    g2.quests = qm2;
    qm2.restore(data);
    expect(qm2.states[q.id].status).toBe('active');
    expect(qm2.states[q.id].progress).toBe(1);
    expect(qm2.states[q.id].targets.length).toBe(q.count - 1); // respawna restantes
  });
});

describe('mercador regional (setActiveShop)', () => {
  it('cada mercador tem estoque próprio; trocar de loja troca o estoque', () => {
    const g = makeGame();
    g.setActiveShop('hub');
    g.rerollShop();
    const hubStock = g.shopStock;
    expect(hubStock.length).toBe(7); // 5 equipamentos + 2 poções (ADR 0104)
    g.setActiveShop('vau_palafitas');
    expect(g.shopStock).toBeNull(); // gera sob demanda ao abrir
    g.rerollShop();
    const vauStock = g.shopStock;
    expect(vauStock).not.toBe(hubStock);
    g.setActiveShop('hub');
    expect(g.shopStock).toBe(hubStock); // estoque do hub preservado
  });
});
