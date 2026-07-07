import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { SettlementManager } from '../src/world/SettlementManager.js';
import { InteriorManager } from '../src/world/InteriorManager.js';
import { interactionSystem } from '../src/systems/interaction.js';
import { rerollShop, shopCategory } from '../src/gameplay/economy.js';
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
    // Clareira (9) + palafitas (5) + lenhadores (4) + degelo (5) = 23.
    expect(doors.length).toBeGreaterThanOrEqual(20);
    const themes = new Set(doors.map(([, , i]: any) => i.interiorTheme));
    expect(themes.has('market')).toBe(true);
    expect(themes.has('tavern')).toBe(true);
    expect(themes.has('leader')).toBe(true);
  });

  it('todas as 4 vilas têm uma casa do jardineiro (garden) que vende sementes (E21.3)', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    const gardenDoors = [...g.world.query(C.Transform, C.Interactable)]
      .filter(([, , i]: any) => i.kind === 'house' && i.interiorTheme === 'garden');
    // Uma casa de jardineiro por vila (4 vilas).
    expect(gardenDoors.length).toBe(4);
    // O tema garden é uma loja de categoria 'garden'.
    expect(INTERIOR_THEMES.garden.service).toBe('shop');
    expect(INTERIOR_THEMES.garden.shopKind).toBe('garden');
    void sm;
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
    expect(g.shopStock.length).toBe(13); // 5 equip + 2 poções + 3 ingredientes + 1 comida + 2 sementes (ADR 0104/0138/0143)
  });

  it('mercadores especializados vendem só sua categoria (E21.2)', () => {
    const g = makeGame();
    // Armeiro: só equipamento (+ poção), nada de ingrediente/semente/comida.
    g._interiorBias = { 'interior:weapons': 'weapon' };
    g.activeShopKey = 'interior:weapons';
    expect(shopCategory(g)).toBe('weapon');
    rerollShop(g);
    expect(g.shopStock.some((s) => s.ingredient || s.seed)).toBe(false);
    expect(g.shopStock.filter((s) => s.item?.type === 'weapon').length).toBe(5);
    // Cozinheiro: comida + ingredientes (+ poção), sem equipamento nem semente.
    g._interiorKind = { 'interior:cook': 'food' };
    g.activeShopKey = 'interior:cook';
    expect(shopCategory(g)).toBe('food');
    rerollShop(g);
    expect(g.shopStock.some((s) => s.seed)).toBe(false);
    expect(g.shopStock.some((s) => s.ingredient)).toBe(true);
    expect(g.shopStock.some((s) => s.item?.effect === 'buff')).toBe(true); // comida
    expect(g.shopStock.some((s) => s.item?.type === 'weapon' || s.item?.type === 'armor')).toBe(false);
    // Jardineiro: só sementes (+ ingredientes forrageáveis).
    g._interiorKind = { 'interior:garden': 'garden' };
    g.activeShopKey = 'interior:garden';
    expect(shopCategory(g)).toBe('garden');
    rerollShop(g);
    expect(g.shopStock.some((s) => s.seed)).toBe(true);
    expect(g.shopStock.some((s) => s.item)).toBe(false);
  });
});

describe('Cozinheiro na taverna (E21.2)', () => {
  it('a taverna ganha um cozinheiro (merchant, categoria food) além da taverneira', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    addPlayer(g, 0);
    im.enter('tavern');
    expect(im.active.cookId).not.toBe(null);
    const cook = g.world.get(im.active.cookId, C.Interactable);
    expect(cook.kind).toBe('merchant');
    expect(cook.shopId).toBe('interior:cook');
    expect(g._interiorKind['interior:cook']).toBe('food');
    const cid = im.active.cookId;
    im.exit();
    g.world.flushDestroyed();
    expect(g.world.entities.has(cid)).toBe(false); // some ao sair
    // Loja normal não tem cozinheiro.
    im.enter('weapons');
    expect(im.active.cookId).toBe(null);
  });
});

describe('Interiores povoados e vivos (E31)', () => {
  it('enter povoa o interior com aldeões (villager) que somem ao sair', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    addPlayer(g, 0);
    im.enter('market');
    expect(im.active.patrons.length).toBeGreaterThanOrEqual(2);
    const ids = [...im.active.patrons];
    for (const id of ids) expect(g.world.get(id, C.Interactable).kind).toBe('villager');
    im.exit();
    g.world.flushDestroyed();
    for (const id of ids) expect(g.world.entities.has(id)).toBe(false);
  });

  it('o salão comunal reúne mais gente (banquete) que uma loja', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    addPlayer(g, 0);
    im.enter('hall'); const hall = im.active.patrons.length; im.exit();
    im.enter('market'); const shop = im.active.patrons.length;
    expect(hall).toBeGreaterThanOrEqual(6); // vila reunida à mesa
    expect(hall).toBeGreaterThan(shop);
  });

  it('os fregueses refletem moradores reais da vila (nomes do elenco)', () => {
    const g = makeGame();
    const sm = new SettlementManager(g);
    g.settlements = sm; // no jogo o Game registra; no teste, à mão
    const cinza = sm.list.find((s: any) => s.theme === 'lenhadores');
    const im = new InteriorManager(g);
    addPlayer(g, 0, cinza.x, cinza.z);
    g.groupCenter = { x: cinza.x, z: cinza.z };
    im.enter('hall');
    const prompts = im.active.patrons.map((id: number) => g.world.get(id, C.Interactable).prompt);
    const roster = cinza.villagers.map((v: any) => v.name);
    expect(prompts.some((p: string) => roster.some((n: string) => p.includes(n)))).toBe(true);
  });

  it('o NPC encara a câmera (rosto/olhos à mostra, não de costas)', () => {
    const g = makeGame();
    const im = new InteriorManager(g);
    addPlayer(g, 0);
    im.enter('leader');
    const rot = g.world.get(im.active.npcId, C.Transform).rot;
    expect(Math.abs(rot - Math.PI)).toBeGreaterThan(0.5); // não virado de costas (norte)
    expect(Math.abs(rot)).toBeLessThan(Math.PI / 2);       // rosto pra frente (+z, câmera)
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
