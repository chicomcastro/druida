import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { runMatrix, runScenario, equipArmorSet } from '../src/gameplay/simMatrix.js';
import { BALANCE } from '../src/data/balance.js';
import { C } from '../src/core/ecs/components.js';

const avgHpAt = (level: number, count: number) => {
  const rows = runMatrix(spawnGame, {
    styles: ['melee'], enemies: ['rotboar', 'frostfang'], counts: [count], levels: [level], seeds: [1, 2], ticks: 2400,
  });
  return rows.reduce((s, r) => s + r.hpLeftFrac, 0) / rows.length * 100;
};

const spawnGame = () => { const g = makeGame(); const pid = addPlayer(g, 0, 0, 0); return { game: g, playerId: pid }; };
const avgHp = (rows: any[]) => rows.reduce((s, r) => s + r.hpLeftFrac, 0) / rows.length * 100;

/**
 * Canary de balanceamento (E42, ADR 0175): trava as faixas-alvo medidas pelo
 * simulador (bot melee-sem-esquiva como PISO de dificuldade), para que um tuning
 * futuro não deixe o jogo trivial nem impossível sem alguém perceber. Usa poucos
 * inimigos/sementes e teto de ticks baixo para rodar rápido no CI.
 */
describe('Canary de balanceamento (E42)', () => {
  it('os fatores globais de dificuldade estão presentes e ativos', () => {
    expect(BALANCE.enemy.hpBase).toBeGreaterThan(1);   // inimigos mais resistentes que a base crua
    expect(BALANCE.enemy.damageBase).toBeGreaterThan(1); // e batendo mais forte
  });

  it('1 inimigo comum dá trabalho (não trivial) e 3 juntos são bem mais difíceis', () => {
    // rotboar (leve) + frostfang (médio): ambos resolvem sem timeout, então a
    // vida restante é sinal limpo de dificuldade. melee = piso (pior caso).
    const rows = runMatrix(spawnGame, {
      styles: ['melee'], enemies: ['rotboar', 'frostfang'], counts: [1, 3], levels: [1], seeds: [1, 2], ticks: 2400,
    });
    const solo = rows.filter((r) => r.count === 1);
    const pack = rows.filter((r) => r.count === 3);
    const soloHp = avgHp(solo), packHp = avgHp(pack);

    // 1 comum: não é trivial (deixa < 90% de vida) mas também não massacra (> 45%).
    expect(soloHp).toBeLessThan(90);
    expect(soloHp).toBeGreaterThan(45);
    // 3 juntos custam MUITO mais que 1 (delta grande) e ficam genuinamente duros.
    expect(soloHp - packHp).toBeGreaterThan(20);
    expect(packHp).toBeLessThan(55);
  });

  it('a curva por nível não drifta: 1 comum dá trabalho do início ao fim (E45)', () => {
    // O grande risco da escala por nível é o jogo virar trivial (super-gear) ou
    // impossível (inimigos disparam) conforme se sobe. Aqui travamos que matar 1
    // comum continua "médio" (nem trivial, nem massacre) do L1 ao L20 — a curva
    // suavizada (enemy.hpPerLevel/damagePerLevel) mantém o piso estável.
    // Durante a jornada (L1–L10) matar 1 comum continua custando (nem trivial).
    for (const level of [1, 10]) {
      const hp = avgHpAt(level, 1);
      expect(hp).toBeLessThan(92);   // não é trivial
      expect(hp).toBeGreaterThan(40); // nem massacre
    }
    // No endgame (L20, arma de tier alto), 1 comum LEVE pode ser fácil — poder
    // vem do gear (design MCD) — mas nunca vira um massacre contra o jogador.
    expect(avgHpAt(20, 1)).toBeGreaterThan(40);
    // As curvas por nível ficaram mais suaves que o default histórico (0.16/0.07).
    expect(BALANCE.enemy.hpPerLevel).toBeLessThanOrEqual(0.12);
    expect(BALANCE.enemy.damagePerLevel).toBeLessThanOrEqual(0.05);
  });

  it('COM ARMADURA o vale do meio do jogo some — era artefato de medição (E49)', () => {
    // Piso pelado tem um vale no trio a L10-15 (a HP do inimigo cresce mais que a
    // arma). Vestindo armadura no tier (mitigação + vida que escalam com o gear),
    // o trio volta a ser médio/difícil — o "poder vem do gear" cobre a curva.
    const nu = (level: number, armor: boolean) => {
      const rows = runMatrix(spawnGame, {
        styles: ['melee'], enemies: ['husk', 'bogbrute'], counts: [3], levels: [level], seeds: [1, 2, 3], ticks: 3000, armor,
      });
      return rows.reduce((s, r) => s + r.hpLeftFrac, 0) / rows.length * 100;
    };
    for (const level of [10, 15]) {
      const pelado = nu(level, false), comGear = nu(level, true);
      expect(comGear).toBeGreaterThan(pelado + 15); // armadura ajuda MUITO no vale
      expect(comGear).toBeGreaterThan(30);          // trio deixa de ser quase-wipe
    }
  });

  it('retrato COM gear por estilo: piso confortável, kite muito seguro (E51)', () => {
    const at = (style: any) => {
      const rows = runMatrix(spawnGame, {
        styles: [style], enemies: ['husk', 'bogbrute'], counts: [3], levels: [10], seeds: [1, 2, 3], ticks: 3000, armor: true,
      });
      return rows.reduce((s, r) => s + r.hpLeftFrac, 0) / rows.length * 100;
    };
    const melee = at('melee'), ranged = at('ranged');
    expect(melee).toBeGreaterThan(35);   // piso com gear: trio é médio, não wipe
    expect(ranged).toBeGreaterThan(melee); // kitar é mais seguro que encarar
    expect(ranged).toBeGreaterThan(80);   // ranged com gear quase não apanha
  });

  it('afixos de armadura e dons entram no piso (endgame fiel — E52)', () => {
    // Rarity mais alta traz afixos (Vitalidade→vida, Baluarte→mitigação); o dom
    // Casca dá +20% de vida. O simulador passa a modelar isso.
    const stats = (rarity: string, boon: boolean) => {
      const g = makeGame(); const pid = addPlayer(g, 0, 0, 0); g.progress.level = 15;
      if (boon) g.boons = { b0: 'casca' };
      equipArmorSet(g, pid, 15, rarity);
      const hp = g.world.get(pid, C.Health), eq = g.world.get(pid, C.Equipment);
      return { hp: hp.max, mit: eq.mitigation };
    };
    const common = stats('common', false), unique = stats('unique', false), maxed = stats('unique', true);
    expect(unique.hp).toBeGreaterThan(common.hp);      // Vitalidade soma vida
    expect(unique.mit).toBeGreaterThan(common.mit);    // Baluarte soma mitigação
    expect(maxed.hp).toBeGreaterThan(unique.hp);        // Casca (+20%) por cima
    // Endgame kitado sobrevive melhor que gear comum (o poder vem do gear — MCD).
    const hpTrio = (rarity: string, boons?: string[]) => {
      const rows = runMatrix(spawnGame, {
        styles: ['melee'], enemies: ['husk', 'bogbrute'], counts: [3], levels: [15], seeds: [1, 2, 3],
        ticks: 3000, armor: true, armorRarity: rarity, boons,
      });
      return rows.reduce((s, r) => s + r.hpLeftFrac, 0) / rows.length * 100;
    };
    const maxedTrio = hpTrio('unique', ['casca']);
    expect(maxedTrio).toBeGreaterThan(hpTrio('common') + 10); // gear+dom melhoram bem a sobrevivência
    expect(maxedTrio).toBeGreaterThan(50);                    // e o trio fica confortável (médio)
  });

  it('CHEFES são o desafio do endgame — não comuns (E53)', () => {
    // Personagem kitado (unique+Casca). Contra comuns ele passeia (E52 ~90%+);
    // contra um CHEFE a luta custa caro, mesmo esquivando.
    const boss = runScenario(spawnGame, {
      style: 'melee_dodge', enemy: 'rotlord', boss: true, level: 15, seed: 1,
      armor: true, armorRarity: 'unique', boons: ['casca'], reaction: 0.6, ticks: 5000,
    });
    expect(boss.dps).toBeGreaterThan(0);        // fix de alcance: o bot acerta o chefe grande (raio 1.6)
    expect(boss.hpLeftFrac).toBeLessThan(0.7);  // o chefe cobra caro (vs. comuns ~0.9+)
  });

  it('ELITES são um degrau acima do comum, mas o kitado aguenta (E53)', () => {
    const plain = runScenario(spawnGame, {
      style: 'melee_dodge', enemy: 'husk', count: 3, level: 10, seed: 1,
      armor: true, armorRarity: 'unique', boons: ['casca'], reaction: 0.6, ticks: 3000,
    });
    const elite = runScenario(spawnGame, {
      style: 'melee_dodge', enemy: 'husk', count: 3, level: 10, seed: 1, eliteAffix: 'petreo',
      armor: true, armorRarity: 'unique', boons: ['casca'], reaction: 0.6, ticks: 3000,
    });
    expect(elite.hpLeftFrac).toBeLessThanOrEqual(plain.hpLeftFrac); // elite não é mais fácil
    expect(elite.survived).toBe(true);                              // mas o kitado vence
  });

  it('afixos comportamentais e dom de dano entram e mudam o combate (E54)', () => {
    const base = (opts: any) => runScenario(spawnGame, {
      style: 'melee', enemy: 'husk', count: 3, level: 10, seed: 1,
      armor: true, armorRarity: 'rare', ticks: 3000, ...opts,
    });
    const baseline = base({});
    const lifesteal = base({ affixes: ['lifesteal'] });
    const thorns = base({ affixes: ['thorns'] });
    const cacada = base({ boons: ['cacada'] });
    expect(lifesteal.hpLeftFrac).toBeGreaterThan(baseline.hpLeftFrac + 0.05); // Sedento sustenta a vida
    expect(thorns.dps).toBeGreaterThan(baseline.dps);   // Espinhos reflete → morte mais rápida (mais DPS efetivo)
    expect(cacada.dps).toBeGreaterThan(baseline.dps);   // dom Instinto de Caça: +dano
  });

  it('o inimigo "duro" (Espectro) é fatal para quem não esquiva, mas justo p/ quem esquiva', () => {
    // Piso (melee sem esquiva): não consegue derrubá-lo (é rápido e atordoa —
    // encarar de frente não funciona). Sinal robusto: não limpa (ttk nulo).
    const plain = runScenario(spawnGame, { style: 'melee', enemy: 'ashwraith', count: 1, seed: 1, ticks: 2400 });
    expect(plain.ttk).toBe(null);
    // Jogador que ESQUIVA o telégrafo vence com folga (não é injusto).
    const dodge = runScenario(spawnGame, { style: 'melee_dodge', enemy: 'ashwraith', count: 1, seed: 1, ticks: 3000 });
    expect(dodge.survived).toBe(true);
    // À distância (kite) também resolve sem apanhar.
    const ranged = runScenario(spawnGame, { style: 'ranged', enemy: 'ashwraith', count: 1, seed: 1, ticks: 2400 });
    expect(ranged.survived).toBe(true);
    expect(ranged.ttk).toBeGreaterThan(0);
  });
});
