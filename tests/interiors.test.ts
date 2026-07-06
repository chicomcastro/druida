import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { SettlementManager } from '../src/world/SettlementManager.js';
import { InteriorManager } from '../src/world/InteriorManager.js';
import { interactionSystem } from '../src/systems/interaction.js';
import { rerollShop } from '../src/gameplay/economy.js';
import { INTERIOR_THEMES, interiorTheme, TAVERN } from '../src/data/interiors.js';

describe('Interiores — dados (ADR 0094)', () => {
  it('lojas têm viés de estoque; taverna descansa; liderança/salão conversam', () => {
    expect(INTERIOR_THEMES.weapons.service).toBe('shop');
    expect(INTERIOR_THEMES.weapons.shopBias).toBe('weapon');
    expect(INTERIOR_THEMES.armor.shopBias).toBe('armor');
    expect(INTERIOR_THEMES.tavern.service).toBe('rest');
    expect(INTERIOR_THEMES.leader.service).toBe('talk');
    expect(INTERIOR_THEMES.hall.lines.length).toBeGreaterThan(1);
  });

  it('interiorTheme cai na moradia genérica para id desconhecido', () => {
    expect(interiorTheme('nao_existe').id).toBe('home');
    expect(interiorTheme('tavern').id).toBe('tavern');
  });
});

describe('SettlementManager — portas entráveis', () => {
  it('a Clareira ganha portas temáticas (loja/taverna/liderança/salão)', () => {
    const g = makeGame();
    new SettlementManager(g);
    const doors = [...g.world.query(C.Transform, C.Interactable)]
      .filter(([, , i]: any) => i.kind === 'house');
    expect(doors.length).toBeGreaterThanOrEqual(5);
    const themes = new Set(doors.map(([, , i]: any) => i.interiorTheme));
    for (const t of ['weapons', 'armor', 'tavern', 'leader', 'hall']) expect(themes.has(t)).toBe(true);
  });
});

describe('SettlementManager — vilas 2–4 vivas (E7)', () => {
  it('todas as 4 vilas ganham portas entráveis (mercado + taverna)', () => {
    const g = makeGame();
    new SettlementManager(g);
    const doors = [...g.world.query(C.Transform, C.Interactable)]
      .filter(([, , i]: any) => i.kind === 'house');
    // Clareira (9) + palafitas (5) + lenhadores (3) + degelo (5) = 22.
    expect(doors.length).toBeGreaterThanOrEqual(20);
    const themes = new Set(doors.map(([, , i]: any) => i.interiorTheme));
    expect(themes.has('market')).toBe(true);
    expect(themes.has('tavern')).toBe(true);
    expect(themes.has('leader')).toBe(true);
  });

  it('mercado geral é loja sem viés (vende de tudo)', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    addPlayer(g, 0);
    im.enter('market');
    expect(g.world.get(im.active.npcId, C.Interactable).kind).toBe('merchant');
    expect(g._interiorBias['interior:market']).toBe(null);
  });
});

describe('InteriorManager — entrar/sair', () => {
  it('enter suspende o mundo, cria o NPC certo e teletransporta para a sala', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    const pid = addPlayer(g, 0, 5, 5);
    g.groupCenter = { x: 5, z: 5 };
    im.enter('weapons', 'armeiro');
    expect(g.inDungeon).toBe(true);
    expect(im.active.theme.id).toBe('weapons');
    const npc = g.world.get(im.active.npcId, C.Interactable);
    expect(npc.kind).toBe('merchant');
    expect(npc.shopId).toBe('interior:weapons');
    expect(g._interiorBias['interior:weapons']).toBe('weapon');
    // Jogador foi para a sala isolada (longe do mundo aberto).
    expect(g.world.get(pid, C.Transform).x).toBeLessThan(-900);
  });

  it('enter não empilha um segundo interior', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    addPlayer(g, 0);
    im.enter('tavern');
    const first = im.active;
    im.enter('weapons');
    expect(im.active).toBe(first); // ignorado
  });

  it('exit restaura o mundo, destrói o NPC e traz o grupo de volta', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    const pid = addPlayer(g, 0, 7, -3);
    g.groupCenter = { x: 7, z: -3 };
    im.enter('leader');
    const npcId = im.active.npcId;
    im.exit();
    g.world.flushDestroyed(); // remoções são enfileiradas e aplicadas por frame
    expect(g.inDungeon).toBe(false);
    expect(im.active).toBe(null);
    expect(g.world.entities.has(npcId)).toBe(false);
    expect(g.world.get(pid, C.Transform).x).toBeGreaterThan(4); // perto do retorno (7)
  });

  it('NPC de talk é villager; de rest é tavern', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    addPlayer(g, 0);
    im.enter('hall');
    expect(g.world.get(im.active.npcId, C.Interactable).kind).toBe('villager');
    im.exit();
    im.enter('tavern');
    expect(g.world.get(im.active.npcId, C.Interactable).kind).toBe('tavern');
  });

  it('taverna e salão comunal têm caldeirão (kitchen); loja não (E19.6)', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    addPlayer(g, 0);
    // Taverna cozinha
    im.enter('tavern');
    expect(im.active.kitchenId).not.toBe(null);
    expect(g.world.get(im.active.kitchenId, C.Interactable).kind).toBe('kitchen');
    const kid = im.active.kitchenId;
    im.exit();
    g.world.flushDestroyed();
    expect(g.world.entities.has(kid)).toBe(false); // some ao sair
    // Salão comunal cozinha
    im.enter('hall');
    expect(g.world.get(im.active.kitchenId, C.Interactable).kind).toBe('kitchen');
    im.exit();
    // Loja não tem caldeirão
    im.enter('weapons');
    expect(im.active.kitchenId).toBe(null);
  });
});

describe('InteriorManager — taverna (descanso + refeição)', () => {
  it('rest cura o grupo, tira do chão, dá o buff, amanhece e salva', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    const pid = addPlayer(g, 0);
    const hp = g.world.get(pid, C.Health);
    const pc = g.world.get(pid, C.PlayerControlled);
    hp.hp = 1; pc.downed = true;
    g.dayNight = { time: 0.7, weather: { kind: 'x' } };
    im.enter('tavern');
    im.rest();
    expect(hp.hp).toBe(hp.max);
    expect(pc.downed).toBe(false);
    expect(g.meal.mul).toBeCloseTo(1 + TAVERN.mealDmg, 5);
    expect(g.meal.expire).toBe(TAVERN.mealDuration);
    expect(g.dayNight.time).toBeCloseTo(0.08, 5);
    expect(g.dayNight.weather).toBe(null);
    expect(g.events.some((e) => e.e === 'rested')).toBe(true);
  });

  it('update expira o bônus de refeição', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    g.meal = { mul: 1.2, expire: 0.1 };
    im.update(0.2);
    expect(g.meal).toBe(null);
  });

  it('dmgMul aplica o bônus da refeição enquanto ativo', () => {
    const g = makeGame();
    new InteriorManager(g);
    const pid = addPlayer(g, 0);
    const base = g.dmgMul(pid);
    g.meal = { mul: 1.25, expire: 5 };
    expect(g.dmgMul(pid)).toBeCloseTo(base * 1.25, 5);
  });
});

describe('Loja com viés de estoque (ADR 0094)', () => {
  it('rerollShop de uma armaduraria só oferece armaduras (fora a poção)', () => {
    const g = makeGame();
    g._interiorBias = { 'interior:armor': 'armor' };
    g.activeShopKey = 'interior:armor';
    rerollShop(g);
    for (const s of g.shopStock.slice(0, 3)) expect(s.item.type).toBe('armor');
  });

  it('mercador sem viés mantém sortimento variado (não força tipo)', () => {
    const g = makeGame();
    g.activeShopKey = 'hub';
    rerollShop(g);
    expect(g.shopStock.length).toBe(11); // 5 equip + 2 poções + 3 ingredientes + 1 comida (ADR 0104/0138)
  });
});

describe('Interação — porta abre o interior', () => {
  it('pressionar E numa porta chama interiors.enter', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    g.interiors = im;
    g.menus = { openShop() {}, openStash() {} };
    const pid = addPlayer(g, 0, 0, 0);
    // Porta entrável colada ao jogador.
    const door = g.world.createEntity();
    g.world.add(door, C.Transform, { x: 1, z: 0, rot: 0 });
    g.world.add(door, C.Interactable, { kind: 'house', interiorTheme: 'weapons', houseLabel: 'armeiro', range: 3, used: false });
    const intent = g.world.get(pid, C.Intent);
    intent.interact = true;
    interactionSystem(g, 0.016);
    expect(g.inDungeon).toBe(true);
    expect(im.active.theme.id).toBe('weapons');
  });
});
