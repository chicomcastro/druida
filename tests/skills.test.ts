import { describe, it, expect } from 'vitest';
import { makeGame } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import {
  SKILL_TREES, ensureSkillState, gainProficiency, canLearn, learn, respec,
  skillBonus, nodeText,
} from '../src/gameplay/skills.js';

describe('Especialização & árvore de talentos (ADR 0093)', () => {
  it('ensureSkillState cria os campos em save antigo', () => {
    const g = makeGame();
    g.progress = { xp: 0, level: 1, enchantPoints: 0 }; // sem campos de talento
    ensureSkillState(g);
    expect(g.progress.proficiency).toEqual({});
    expect(g.progress.skills).toEqual({});
    expect(g.progress.skillPoints).toBe(0);
  });

  it('proficiência acumula por uso da trilha', () => {
    const g = makeGame();
    gainProficiency(g, 'axe');
    gainProficiency(g, 'axe', 4);
    gainProficiency(g, 'wolf');
    expect(g.progress.proficiency.axe).toBe(5);
    expect(g.progress.proficiency.wolf).toBe(1);
  });

  it('canLearn respeita pontos, teto e pré-requisito', () => {
    const g = makeGame();
    ensureSkillState(g);
    const [first, second] = SKILL_TREES.axe; // second.req === first.id
    // Sem pontos: nada é aprendível.
    expect(canLearn(g, first.id)).toBe(false);
    g.progress.skillPoints = 5;
    // Nó com pré-requisito não atendido fica bloqueado.
    expect(canLearn(g, second.id)).toBe(false);
    expect(canLearn(g, first.id)).toBe(true);
  });

  it('learn gasta ponto e destrava o nó seguinte; teto é respeitado', () => {
    const g = makeGame();
    ensureSkillState(g);
    g.progress.skillPoints = 10;
    const [first, second] = SKILL_TREES.axe;
    expect(learn(g, first.id)).toBe(true);
    expect(g.progress.skills[first.id]).toBe(1);
    expect(g.progress.skillPoints).toBe(9);
    expect(canLearn(g, second.id)).toBe(true); // pré-requisito agora satisfeito
    // Investe até o teto do primeiro nó.
    while (canLearn(g, first.id)) learn(g, first.id);
    expect(g.progress.skills[first.id]).toBe(first.max);
    expect(learn(g, first.id)).toBe(false); // acima do teto
  });

  it('respec devolve todos os pontos gastos', () => {
    const g = makeGame();
    ensureSkillState(g);
    g.progress.skillPoints = 3;
    const [first] = SKILL_TREES.axe;
    learn(g, first.id); learn(g, first.id);
    expect(g.progress.skillPoints).toBe(1);
    const refunded = respec(g);
    expect(refunded).toBe(2);
    expect(g.progress.skillPoints).toBe(3);
    expect(g.progress.skills).toEqual({});
  });

  it('skillBonus só conta a trilha da arma equipada', () => {
    const g = makeGame();
    const id = g.world.createEntity();
    const eq: any = { weapon: null };
    g.world.add(id, C.Equipment, eq);
    g.world.add(id, C.Form, { current: 'humanoid', list: ['humanoid'] });
    ensureSkillState(g);
    g.progress.skillPoints = 3;
    const [axePower] = SKILL_TREES.axe;
    learn(g, axePower.id);
    // Sem arma de machado equipada: bônus não se aplica.
    eq.weapon = { type: 'weapon', family: 'scythe' };
    expect(skillBonus(g, id, 'dmg')).toBe(0);
    // Com machado: bônus vale.
    eq.weapon = { type: 'weapon', family: 'axe' };
    expect(skillBonus(g, id, 'dmg')).toBe(axePower.per);
  });

  it('skillBonus soma a trilha da forma animal ativa', () => {
    const g = makeGame();
    const id = g.world.createEntity();
    g.world.add(id, C.Equipment, { weapon: null });
    const form: any = { current: 'humanoid', list: ['humanoid', 'wolf'] };
    g.world.add(id, C.Form, form);
    ensureSkillState(g);
    g.progress.skillPoints = 5;
    const [wolfDur, wolfDmg] = SKILL_TREES.wolf;
    learn(g, wolfDur.id); learn(g, wolfDmg.id);
    expect(skillBonus(g, id, 'formDur')).toBe(0);
    form.current = 'wolf';
    expect(skillBonus(g, id, 'formDur')).toBe(wolfDur.per);
    expect(skillBonus(g, id, 'dmg')).toBe(wolfDmg.per);
  });

  it('nodeText interpola o valor por nível', () => {
    const [node] = SKILL_TREES.axe;
    expect(nodeText(node, 2)).toContain(String(node.per * 2));
  });
});
