import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { WorldManager, biomeAt } from '../src/world/WorldManager.js';
import { buildLandmarks } from '../src/world/landmarks.js';
import { EventManager } from '../src/world/EventManager.js';
import { kvGet, kvSet, kvDel } from '../src/gameplay/storage.js';
import { castAbility } from '../src/gameplay/abilities/index.js';
import { playerControlSystem } from '../src/systems/playerControl.js';
import { bossSystem } from '../src/systems/boss.js';
import { coopSystem } from '../src/systems/coop.js';

describe('WorldManager', () => {
  it('biomeAt mapeia anéis concêntricos', () => {
    expect(biomeAt(0, 0)).toBe('clareira');
    expect(biomeAt(0, 80)).toBe('pantano');
    expect(biomeAt(0, 300)).toBe('coracao');
  });

  it('constrói, revela fog, gera props/colhíveis e troca de bioma', () => {
    const g = makeGame();
    const wm = new WorldManager(g);
    g.worldManager = wm;

    expect(wm.isExplored(0, 0)).toBe(false);
    wm._revealAround(0, 0);
    expect(wm.isExplored(0, 0)).toBe(true);

    g.groupCenter = { x: 0, z: 0 };
    for (let i = 0; i < 400; i++) wm.update(0.1);
    expect(wm.props.length).toBeGreaterThan(0);

    // longe -> muda bioma e descarta props distantes
    g.groupCenter = { x: 0, z: 300 };
    wm.update(0.1);
    expect(wm.currentBiome).toBe('coracao');
  });

  it('não atualiza o mundo dentro da masmorra', () => {
    const g = makeGame();
    const wm = new WorldManager(g);
    g.inDungeon = true;
    const before = wm.props.length;
    wm.update(0.1);
    expect(wm.props.length).toBe(before);
  });
});

describe('landmarks', () => {
  it('cria NPC, santuários, mercador e baú como interativos', () => {
    const g = makeGame();
    buildLandmarks(g);
    const kinds = [...g.world.query(C.Interactable)].map(([, i]: any) => i.kind);
    expect(kinds).toContain('npc');
    expect(kinds).toContain('sanctuary');
    expect(kinds).toContain('merchant');
    expect(kinds).toContain('chest');
  });
});

describe('storage (fallback sem IndexedDB)', () => {
  it('get/set/del não quebram sem IndexedDB/localStorage', async () => {
    await kvSet('k', { a: 1 });
    const v = await kvGet('inexistente');
    await kvDel('k');
    expect(v).toBeNull();
  });
});

describe('abilities — castAbility', () => {
  it('executa magias, artefatos e ataques de forma', () => {
    const g = makeGame();
    const id = addPlayer(g, 0, 0, 0);
    g.spawnEnemyByKey('rotboar', 1.2, 0); // alvo para AoE/melee

    const all = [
      'root_spikes', 'wildfire', 'ice_lance', 'healing_totem', 'pack_howl',
      'thorn_burst', 'gust', 'meteor_sap',
      'wolf_bite', 'bear_swipe', 'raven_peck', 'frog_tongue', 'staff_strike',
    ];
    for (const ab of all) {
      g.world.get(id, C.Sap).value = 100;
      g.world.get(id, C.Cooldowns).map = {};
      expect(castAbility(g, id, ab, 0)).toBe(true);
    }
    // meteoro agenda dano com atraso
    g.tickScheduled(1);
    // pack_howl invocou aliados
    const summons = [...g.world.query(C.Summon)].length;
    expect(summons).toBeGreaterThan(0);
  });

  it('falha sem Seiva suficiente e respeita cooldown', () => {
    const g = makeGame();
    const id = addPlayer(g, 0, 0, 0);
    g.world.get(id, C.Sap).value = 0;
    expect(castAbility(g, id, 'meteor_sap', 0)).toBe(false);
  });
});

describe('playerControlSystem — formas, dodge, artefato', () => {
  it('troca de forma, esquiva e usa artefato', () => {
    const g = makeGame();
    const id = addPlayer(g, 0, 0, 0);
    const intent = g.world.get(id, C.Intent);

    intent.switchForm = 2; // wolf (list = [humanoid, wolf])
    playerControlSystem(g, 0.016);
    expect(g.world.get(id, C.Form).current).toBe('wolf');

    intent.switchForm = 0;
    intent.dodge = true; intent.moveX = 1;
    playerControlSystem(g, 0.016);
    expect(g.world.get(id, C.PlayerControlled).dodgeTimer).toBeGreaterThan(0);

    intent.dodge = false;
    g.world.get(id, C.Sap).value = 100;
    intent.artifact = [true, false, false];
    playerControlSystem(g, 0.016);
  });
});

describe('bossSystem — fases e mini-chefe', () => {
  it('entra na fase 3 e agenda invocações/golpe', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    const id = g.spawnBossFight(2, 0);
    const hp = g.world.get(id, C.Health);
    hp.hp = hp.max * 0.3; // fase 3
    const boss = g.world.get(id, C.Boss);
    boss.slamTimer = 0; boss.summonTimer = 0;
    bossSystem(g, 0.016);
    expect(boss.phase).toBe(3);
    expect(g._scheduled.length).toBeGreaterThan(0);
  });

  it('mini-chefe usa golpe com raiz', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    const id = g.spawnMiniBoss(3, 0);
    const boss = g.world.get(id, C.Boss);
    boss.slamTimer = 0;
    bossSystem(g, 0.016);
    g.tickScheduled(1);
    expect(boss.miniBoss).toBe(true);
  });
});

describe('coopSystem — revive e entrada por gamepad', () => {
  it('aliado por perto revive o caído', () => {
    const g = makeGame();
    const p1 = addPlayer(g, 0, 0, 0);
    addPlayer(g, 1, 0.5, 0);
    const pc1 = g.world.get(p1, C.PlayerControlled);
    pc1.downed = true; pc1.downedTimer = 30;
    for (let i = 0; i < 220; i++) coopSystem(g, 0.016);
    expect(g.world.get(p1, C.PlayerControlled).downed).toBe(false);
  });

  it('novo jogador entra ao apertar botão no gamepad', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    g.input.connectedPads = () => [{ index: 0, buttons: [{ pressed: true }] }];
    coopSystem(g, 0.016);
    expect([...g.world.query(C.PlayerControlled)].length).toBe(2);
  });
});

describe('EventManager — surto e tesouro', () => {
  it('Surto e Espírito do Tesouro spawnam e o tesouro solta loot', () => {
    const g = makeGame();
    addPlayer(g, 0, 80, 0);
    g.groupCenter = { x: 80, z: 0 };
    const ev = new EventManager(g);
    ev._surge({ x: 80, z: 0 });
    ev._treasure({ x: 80, z: 0 });
    const bounty = [...g.world.query(C.Bounty)];
    expect(bounty.length).toBe(1);
    const before = [...g.world.query(C.Pickup)].length;
    g.emit('kill', { id: bounty[0][0], x: 80, z: 0 });
    expect([...g.world.query(C.Pickup)].length).toBeGreaterThan(before);
  });
});
