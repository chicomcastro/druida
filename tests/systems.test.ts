import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C, Factions, Transform, Velocity, Health, Collider, Faction, StatusEffects } from '../src/core/ecs/components.js';

import { movementSystem } from '../src/systems/movement.js';
import { aiSystem } from '../src/systems/ai.js';
import { statusSystem } from '../src/systems/status.js';
import { druidSystem } from '../src/systems/druid.js';
import { projectileSystem } from '../src/systems/projectiles.js';
import { pickupSystem } from '../src/systems/pickups.js';
import { coopSystem } from '../src/systems/coop.js';
import { spawnerSystem } from '../src/systems/spawner.js';
import { bossSystem } from '../src/systems/boss.js';
import { interactionSystem } from '../src/systems/interaction.js';
import { playerControlSystem } from '../src/systems/playerControl.js';
import { createProjectile, createLootOrb } from '../src/entities/factories.js';

function enemy(game: any, x: number, z: number, hp = 30) {
  const id = game.spawnEnemyByKey('rotboar', x, z);
  const h = game.world.get(id, C.Health);
  h.max = hp; h.hp = hp;
  return id;
}

describe('movementSystem', () => {
  it('integra velocidade no transform', () => {
    const g = makeGame();
    const id = g.world.createEntity();
    g.world.add(id, C.Transform, Transform(0, 0));
    g.world.add(id, C.Velocity, { vx: 10, vz: 0, speed: 10 });
    movementSystem(g, 0.1);
    expect(g.world.get(id, C.Transform).x).toBeCloseTo(1, 5);
  });

  it('resolve sobreposição entre colisores sólidos móveis', () => {
    const g = makeGame();
    const a = g.world.createEntity();
    g.world.add(a, C.Transform, Transform(0, 0));
    g.world.add(a, C.Velocity, Velocity(0, 0));
    g.world.add(a, C.Collider, Collider(0.5));
    const b = g.world.createEntity();
    g.world.add(b, C.Transform, Transform(0.3, 0));
    g.world.add(b, C.Velocity, Velocity(0, 0));
    g.world.add(b, C.Collider, Collider(0.5));
    movementSystem(g, 0.016);
    const dx = g.world.get(b, C.Transform).x - g.world.get(a, C.Transform).x;
    expect(Math.abs(dx)).toBeGreaterThan(0.3); // empurrados para longe
  });

  it('knockback move e decai', () => {
    const g = makeGame();
    const id = g.world.createEntity();
    g.world.add(id, C.Transform, Transform(0, 0));
    g.world.add(id, C.Velocity, Velocity(0, 0));
    g.world.add(id, C.Knockback, { vx: 20, vz: 0 });
    movementSystem(g, 0.1);
    expect(g.world.get(id, C.Transform).x).toBeGreaterThan(0);
  });
});

describe('aiSystem', () => {
  it('inimigo persegue o jogador e ataca no alcance', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    const eid = enemy(g, 1, 0); // dentro do attackRange
    const hpBefore = g.world.get(pid, C.Health).hp;
    aiSystem(g, 0.2);
    expect(g.world.get(pid, C.Health).hp).toBeLessThan(hpBefore);
  });

  it('inimigo distante persegue (ganha velocidade na direção do alvo)', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    const eid = enemy(g, 8, 0);
    aiSystem(g, 0.1);
    expect(g.world.get(eid, C.Velocity).vx).toBeLessThan(0); // anda para -x (rumo a 0)
  });

  it('inimigo ranged cria projétil', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    g.spawnEnemyByKey('shadecrow', 6, 0);
    aiSystem(g, 0.1);
    const projteis = [...g.world.query(C.Hitbox)].length;
    expect(projteis).toBeGreaterThan(0);
  });
});

describe('aiSystem — comportamentos', () => {
  it('exploder explode ao alcançar e se destrói', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    const id = g.spawnEnemyByKey('fungling', 1, 0);
    aiSystem(g, 0.2);
    g.world.flushDestroyed();
    expect(g.world.entities.has(id)).toBe(false);
  });

  it('summoner invoca reforços', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    g.spawnEnemyByKey('shaman', 8, 0);
    const before = [...g.world.query(C.Faction)].filter(([, f]: any) => f.team === Factions.ENEMY).length;
    aiSystem(g, 0.1);
    const after = [...g.world.query(C.Faction)].filter(([, f]: any) => f.team === Factions.ENEMY).length;
    expect(after).toBeGreaterThan(before);
  });

  it('aliado (invocação) persegue o inimigo mais próximo', () => {
    const g = makeGame();
    const ally = g.world.createEntity();
    g.world.add(ally, C.Transform, Transform(0, 0));
    g.world.add(ally, C.Velocity, Velocity(0, 0, 5));
    g.world.add(ally, C.Faction, Faction(Factions.PLAYER));
    g.world.add(ally, C.StatusEffects, StatusEffects());
    g.world.add(ally, C.AI, { behavior: 'ally_melee', state: 'idle', aggroRange: 18, attackRange: 1.3, attackCooldown: 1, timer: 0, damage: 8, targetId: 0 });
    g.spawnEnemyByKey('rotboar', 6, 0);
    aiSystem(g, 0.1);
    expect(g.world.get(ally, C.Velocity).vx).toBeGreaterThan(0); // ruma ao inimigo em +x
  });

  it('sem jogadores vivos, inimigo fica parado', () => {
    const g = makeGame();
    const eid = g.spawnEnemyByKey('rotboar', 5, 0);
    aiSystem(g, 0.1);
    const v = g.world.get(eid, C.Velocity);
    expect(v.vx).toBe(0);
    expect(v.vz).toBe(0);
  });
});

describe('statusSystem', () => {
  it('queimadura causa dano e decai; invuln decai', () => {
    const g = makeGame();
    const id = g.world.createEntity();
    g.world.add(id, C.Health, Object.assign(Health(50), { invuln: 0.2 }));
    g.world.add(id, C.StatusEffects, Object.assign(StatusEffects(), { burn: 1, freeze: 0.5 }));
    statusSystem(g, 0.1);
    const hp = g.world.get(id, C.Health);
    const st = g.world.get(id, C.StatusEffects);
    expect(hp.hp).toBeLessThan(50);
    expect(st.burn).toBeLessThan(1);
    expect(st.freeze).toBeLessThan(0.5);
    expect(hp.invuln).toBeLessThan(0.2);
  });
});

describe('druidSystem', () => {
  it('regenera Seiva na forma base e tica cooldowns', () => {
    const g = makeGame();
    const id = addPlayer(g, 0);
    const sap = g.world.get(id, C.Sap);
    sap.value = 10;
    g.world.get(id, C.Cooldowns).map.foo = 0.05;
    druidSystem(g, 0.5);
    expect(g.world.get(id, C.Sap).value).toBeGreaterThan(10);
    expect(g.world.get(id, C.Cooldowns).map.foo).toBeUndefined();
  });

  it('drena Seiva em forma animal e reverte ao esgotar', () => {
    const g = makeGame();
    const id = addPlayer(g, 0);
    const form = g.world.get(id, C.Form);
    form.current = 'wolf';
    g.world.get(id, C.Sap).value = 1;
    druidSystem(g, 1);
    expect(g.world.get(id, C.Form).current).toBe('humanoid');
  });

  it('invocação com TTL é removida ao expirar', () => {
    const g = makeGame();
    const id = g.world.createEntity();
    g.world.add(id, C.Summon, { ownerId: 1, ttl: 0.05 });
    druidSystem(g, 0.1);
    g.world.flushDestroyed();
    expect(g.world.entities.has(id)).toBe(false);
  });
});

describe('projectileSystem', () => {
  it('projétil acerta inimigo e some; lifetime expira', () => {
    const g = makeGame();
    const eid = enemy(g, 0, 0, 100);
    createProjectile(g.world, g.renderer, { x: 0, z: 0, dirX: 1, dirZ: 0, speed: 10, damage: 20, team: Factions.PLAYER, color: 0xfff, range: 10 });
    projectileSystem(g, 0.016);
    g.world.flushDestroyed();
    expect(g.world.get(eid, C.Health).hp).toBeLessThan(100);
  });

  it('lifetime expira e destrói o projétil', () => {
    const g = makeGame();
    const pid = createProjectile(g.world, g.renderer, { x: 50, z: 50, dirX: 1, dirZ: 0, speed: 10, damage: 5, team: Factions.PLAYER, color: 0xfff, range: 0.001 });
    projectileSystem(g, 1);
    g.world.flushDestroyed();
    expect(g.world.entities.has(pid)).toBe(false);
  });
});

describe('pickupSystem', () => {
  it('coleta essência (ímã + encostar)', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 0);
    createLootOrb(g.world, g.renderer, { x: 0.3, z: 0, item: { essence: 7 } });
    pickupSystem(g, 0.1);
    expect(g.world.get(pid, C.Inventory).essence).toBeGreaterThanOrEqual(7);
  });

  it('coleta página de lore (codex)', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    createLootOrb(g.world, g.renderer, { x: 0.2, z: 0, item: { lore: { id: 'lx', title: 'T', text: 'x' } } });
    pickupSystem(g, 0.1);
    expect(g.lore.found.has('lx')).toBe(true);
  });
});

describe('coopSystem', () => {
  it('calcula o centróide do grupo', () => {
    const g = makeGame();
    addPlayer(g, 0, -2, 0);
    addPlayer(g, 1, 2, 0);
    coopSystem(g, 0.016);
    expect(g.groupCenter.x).toBeCloseTo(0, 1);
  });

  it('wipe respawna o grupo no checkpoint', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 40, 40);
    const pc = g.world.get(pid, C.PlayerControlled);
    pc.downed = true; pc.downedTimer = -1; // já sangrou
    coopSystem(g, 0.016);
    const tr = g.world.get(pid, C.Transform);
    expect(Math.hypot(tr.x - g.checkpoint.x, tr.z - g.checkpoint.z)).toBeLessThan(4);
  });
});

describe('spawnerSystem', () => {
  it('spawna inimigos perto do jogador (fora do hub)', () => {
    const g = makeGame();
    addPlayer(g, 0, 80, 0); // longe do hub
    g.groupCenter = { x: 80, z: 0 };
    g._spawnTimer = 0;
    spawnerSystem(g, 0.016);
    const inimigos = [...g.world.query(C.Faction)].filter(([, f]: any) => f.team === Factions.ENEMY).length;
    expect(inimigos).toBeGreaterThan(0);
  });

  it('não spawna dentro da masmorra', () => {
    const g = makeGame();
    addPlayer(g, 0, 80, 0);
    g.inDungeon = true;
    g._spawnTimer = 0;
    spawnerSystem(g, 0.016);
    const inimigos = [...g.world.query(C.Faction)].filter(([, f]: any) => f.team === Factions.ENEMY).length;
    expect(inimigos).toBe(0);
  });
});

describe('bossSystem', () => {
  it('agenda golpe em área e ajusta fase', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    const id = g.spawnBossFight(2, 0);
    const boss = g.world.get(id, C.Boss);
    boss.slamTimer = 0;
    bossSystem(g, 0.016);
    expect(g._scheduled.length).toBeGreaterThan(0); // slam agendado
  });
});

describe('interactionSystem', () => {
  it('roteia interação de mercador para o menu de loja', () => {
    const g = makeGame();
    let opened = false;
    g.menus.openShop = () => { opened = true; };
    addPlayer(g, 0, 0, 0);
    const iid = g.world.createEntity();
    g.world.add(iid, C.Transform, Transform(0.5, 0));
    g.world.add(iid, C.Interactable, { kind: 'merchant', prompt: 'E', range: 3, used: false });
    // marca intenção de interagir no jogador
    for (const [, , , , intent] of g.world.query(C.Transform, C.PlayerControlled, C.Health, C.Intent)) intent.interact = true;
    interactionSystem(g, 0.016);
    expect(opened).toBe(true);
    expect(g.interactPrompt).toBe('E');
  });
});

describe('playerControlSystem', () => {
  it('traduz intenção de movimento em velocidade', () => {
    const g = makeGame();
    const id = addPlayer(g, 0, 0, 0);
    const intent = g.world.get(id, C.Intent);
    intent.moveX = 1; intent.moveZ = 0;
    playerControlSystem(g, 0.016);
    expect(g.world.get(id, C.Velocity).vx).toBeGreaterThan(0);
  });

  it('olha para a direção do movimento quando não há mira por cursor', () => {
    const g = makeGame();
    const id = addPlayer(g, 0, 0, 0);
    const pc = g.world.get(id, C.PlayerControlled);
    const intent = g.world.get(id, C.Intent);
    // Move para +X (sem aim): facing = atan2(moveX, moveZ) = atan2(1,0) = PI/2.
    intent.moveX = 1; intent.moveZ = 0; intent.hasAim = false; intent.aimIsWorldPoint = false;
    playerControlSystem(g, 0.016);
    expect(pc.facing).toBeCloseTo(Math.PI / 2, 5);
    // Parado: mantém a última direção encarada.
    intent.moveX = 0; intent.moveZ = 0;
    playerControlSystem(g, 0.016);
    expect(pc.facing).toBeCloseTo(Math.PI / 2, 5);
  });

  it('ataque básico do humanoide é melee por padrão (atinge alvo à frente, sem projétil)', () => {
    const g = makeGame();
    const id = addPlayer(g, 0, 0, 0); // arma inicial é melee
    const eid = g.spawnEnemyByKey('rotboar', 1.5, 0); // à frente quando encara +X
    const hp0 = g.world.get(eid, C.Health).hp;
    const intent = g.world.get(id, C.Intent);
    intent.attack = true; intent.moveX = 1; intent.moveZ = 0; // encara +X
    playerControlSystem(g, 0.016);
    expect(g.world.get(eid, C.Health).hp).toBeLessThan(hp0); // tomou dano melee
    expect([...g.world.query(C.Hitbox)].length).toBe(0); // sem projétil
  });

  it('ataque básico vira projétil com arma de conjuração (ranged)', () => {
    const g = makeGame();
    const id = addPlayer(g, 0, 0, 0);
    g.equip(id, { type: 'weapon', name: 'Cajado', element: 'fire', damage: 10, style: 'ranged', rarity: 'common', enchants: [] });
    const intent = g.world.get(id, C.Intent);
    intent.attack = true; intent.moveX = 1; intent.moveZ = 0;
    playerControlSystem(g, 0.016);
    expect([...g.world.query(C.Hitbox)].length).toBeGreaterThan(0);
  });
});
