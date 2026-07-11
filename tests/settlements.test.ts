import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { SETTLEMENTS } from '../src/data/settlements.js';
import { SettlementManager } from '../src/world/SettlementManager.js';
import { biomeAt } from '../src/world/WorldManager.js';
import { interactionSystem } from '../src/systems/interaction.js';
import { makeVillagerSpec, buildVoxelModel } from '../src/entities/voxelModels.js';

describe('SETTLEMENTS (dados)', () => {
  it('há pelo menos 3 cidades e cada uma está no anel do seu bioma', () => {
    expect(SETTLEMENTS.length).toBeGreaterThanOrEqual(3);
    for (const s of SETTLEMENTS) expect(biomeAt(s.x, s.z)).toBe(s.biome);
  });

  it('cada cidade tem identidade: tagline, chegada e moradores com falas', () => {
    for (const s of SETTLEMENTS) {
      expect(s.tagline.length).toBeGreaterThan(0);
      expect(s.arrival.length).toBeGreaterThan(0);
      expect(s.villagers.length).toBeGreaterThanOrEqual(2);
      for (const v of s.villagers) expect(v.lines.length).toBeGreaterThan(0);
    }
  });
});

describe('SettlementManager', () => {
  it('constrói as vilas com moradores interativos e colisores', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    // Todos os moradores viram interativos: anciãos com missão são
    // quest_giver (ADR 0047), os demais villager.
    const inters = [...g.world.query(C.Interactable)].map(([, i]: any) => i.kind);
    const villagers = inters.filter((k) => k === 'villager');
    const givers = inters.filter((k) => k === 'quest_giver');
    const total = SETTLEMENTS.reduce((n, s) => n + s.villagers.length, 0);
    // Moradores passivos extras (ADR 0121): pontos médios entre moradores, longe
    // do centro — conta determinística, replicada aqui para o total bater.
    const ambientCount = (s: any) => {
      const base = s.villagers.filter((v: any) => !v.elder && Number.isFinite(v.x));
      if (base.length < 2) return 0;
      const sorted = [...base].sort((a: any, b: any) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
      let made = 0;
      for (let i = 0; i < sorted.length && made < 4; i++) {
        const a = sorted[i], b = sorted[(i + 1) % sorted.length];
        if (Math.hypot((a.x + b.x) / 2, (a.z + b.z) / 2) < 4.5) continue;
        made++;
      }
      return made;
    };
    const ambient = SETTLEMENTS.reduce((n, s) => n + ambientCount(s), 0);
    expect(ambient).toBeGreaterThan(0);
    // Trabalhadores fixos nos postos (ADR 0123): 1 por vila com posto de trabalho.
    const WORKERS = { palafitas: 1, lenhadores: 1, degelo: 1 };
    const workers = SETTLEMENTS.reduce((n, s) => n + (WORKERS[s.theme] ?? 0), 0);
    expect(villagers.length + givers.length).toBe(total + ambient + workers);
    expect(givers.length).toBe(SETTLEMENTS.filter((s) => s.quest).length);
    // Mercadores regionais (fora o hub, que usa o dos landmarks).
    expect(inters.filter((k) => k === 'merchant').length).toBe(SETTLEMENTS.filter((s) => s.merchant).length);
    // Estruturas geram colisores sólidos (cabanas, fogueiras, paliçada…).
    const colliders = [...g.world.query(C.Collider)].filter(([, c]: any) => c.solid);
    expect(colliders.length).toBeGreaterThan(total + 10);
    expect(sm.isSafe(0, 0)).toBe(true);
    expect(sm.isSafe(999, 999)).toBe(false);
    const s1 = SETTLEMENTS[1];
    expect(sm.settlementAt(s1.x, s1.z)?.id).toBe(s1.id);
  });

  it('anuncia a chegada (diálogo só na 1ª visita; banner sempre)', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    const s1 = SETTLEMENTS[1];
    g.groupCenter = { x: s1.x, z: s1.z };
    sm.update();
    expect(g.events.filter((e) => e.e === 'settlementEntered').length).toBe(1);
    expect(g.events.filter((e) => e.e === 'dialogue').length).toBe(1);
    sm.update(); // ainda dentro: não repete
    expect(g.events.filter((e) => e.e === 'settlementEntered').length).toBe(1);
    // sai e volta: banner de novo, diálogo de chegada não
    g.groupCenter = { x: 500, z: 500 };
    sm.update();
    g.groupCenter = { x: s1.x, z: s1.z };
    sm.update();
    expect(g.events.filter((e) => e.e === 'settlementEntered').length).toBe(2);
    expect(g.events.filter((e) => e.e === 'dialogue').length).toBe(1);
  });

  it('não anuncia dentro de masmorra', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    g.inDungeon = true;
    g.groupCenter = { x: 0, z: 0 };
    sm.update();
    expect(g.events.filter((e) => e.e === 'settlementEntered').length).toBe(0);
  });

  it('morador conversa via interação (kind villager -> dialogue)', () => {
    const g = makeGame();
    new SettlementManager(g);
    const [, vtr, vint]: any = [...g.world.query(C.Transform, C.Interactable)]
      .find(([, , i]: any) => i.kind === 'villager');
    const pid = addPlayer(g, 0, vtr.x, vtr.z);
    g.world.get(pid, C.Intent).interact = true;
    interactionSystem(g, 0.016);
    const dlg: any = g.events.find((e) => e.e === 'dialogue');
    expect(dlg).toBeTruthy();
    expect(dlg.p.lines).toEqual(vint.lines);
  });

  it('moradores são modelos voxel com partes animáveis, virados ao centro', () => {
    const g = makeGame();
    new SettlementManager(g);
    const villagers = [...g.world.query(C.Transform, C.Renderable, C.Interactable)]
      .filter(([, , , i]: any) => i.kind === 'villager');
    expect(villagers.length).toBeGreaterThan(0);
    for (const [, tr, r] of villagers as any) {
      expect(r.object3d.userData.gait).toBe('biped');
      expect(Object.keys(r.object3d.userData.parts)).toContain('head');
      expect(Number.isFinite(tr.rot)).toBe(true);
    }
  });

  it('animate pulsa lanternas/chamas e tremula as luzes sem erro', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    expect(sm._flames.length).toBeGreaterThan(0);
    // Fogueiras/lanternas agora entram no pool de luzes (ADR 0065).
    expect(g.lightPool.regs.length).toBeGreaterThan(0);
    const before = sm._flames[0].mesh.material.emissiveIntensity;
    sm.animate(0.9);
    sm.animate(1.7);
    expect(sm._flames[0].mesh.material.emissiveIntensity).not.toBe(before);
  });
});

describe('NPCs voxel (specs)', () => {
  it('makeVillagerSpec: ancião ganha capa, cajado e escala maior', () => {
    const common = makeVillagerSpec({ robe: 0x5a8f5f, trim: 0x6b4a2f });
    const elder = makeVillagerSpec({ robe: 0x3f7a58, trim: 0xe0a93a, glow: 0x9fe06a, elder: true });
    expect(common.parts.some((p) => p.name === 'weapon')).toBe(false);
    expect(elder.parts.some((p) => p.name === 'weapon')).toBe(true);
    expect(elder.scale).toBeGreaterThan(common.scale!);
    const names = common.parts.map((p) => p.name);
    for (const n of ['torso', 'head', 'armL', 'armR', 'legL', 'legR']) expect(names).toContain(n);
  });

  it('Guardiã e mercador têm specs voxel próprias', () => {
    for (const kind of ['guardian', 'merchant', 'villager', 'elder']) {
      const model = buildVoxelModel(kind);
      expect(model).toBeTruthy();
      expect(model!.userData.gait).toBe('biped');
    }
  });
});

describe('mundo vivo (ADR 0055)', () => {
  it('moradores comuns passeiam (Velocity) e param perto de jogadores', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    expect(sm._villagers.length).toBeGreaterThan(0);
    const v = sm._villagers[0];
    // Fixa uma rotina EXTERNA (andarilho de manhã → 'roam'): o cronograma (E34)
    // pode recolher moradores em recintos conforme a hora; aqui testamos o passeio.
    v.archetype = 'wanderer';
    g.dayNight = { time: 0.15 };
    const tr0 = g.world.get(v.id, C.Transform);
    v.wait = 0;
    v.target = { x: tr0.x + 5, z: tr0.z }; // alvo fixo/longe: sem flakiness de RNG
    sm._wander(0.016); // anda em direção ao alvo
    const vel = g.world.get(v.id, C.Velocity);
    expect(Math.hypot(vel.vx, vel.vz)).toBeGreaterThan(0.5);
    // Jogador chega perto -> para (disponível para conversa).
    const tr = g.world.get(v.id, C.Transform);
    addPlayer(g, 0, tr.x + 1, tr.z);
    sm._wander(0.016);
    expect(vel.vx).toBe(0);
    expect(vel.vz).toBe(0);
  });

  it('vilas têm fumaça, bandeiras e água viva registradas para animar', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    expect(sm._smoke.length).toBeGreaterThan(0);
    expect(sm._flags.length).toBeGreaterThanOrEqual(3);
    expect(sm._water.length).toBeGreaterThanOrEqual(2); // lagoa do Vau + barco do píer (ADR 0084)
    const y = sm._smoke[0].mesh.position.y;
    sm.animate(1.2);
    sm.animate(2.4);
    expect(sm._smoke[0].mesh.position.y).not.toBe(y);
  });
});
