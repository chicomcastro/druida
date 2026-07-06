import { describe, it, expect } from 'vitest';
import {
  ACTIVE_SKILL_TREE, skillTreeIsValid, canUnlock, unlock, isUnlocked,
  unlockedAbilities, respecActive, ensureActiveSkills, skillBranchOf,
} from '../src/gameplay/skillTree.js';

function makeGame(points = 0) {
  const events: any[] = [];
  return { progress: { skillPoints: points }, emit: (e: string, p: any) => events.push({ e, p }), _events: events };
}

describe('Árvore de skills ativas (E17)', () => {
  it('todo nó aponta para uma habilidade existente', () => {
    expect(skillTreeIsValid()).toBe(true);
  });

  it('tem ramos temáticos com nós', () => {
    const branches = Object.keys(ACTIVE_SKILL_TREE);
    expect(branches.length).toBeGreaterThanOrEqual(4);
    expect(ACTIVE_SKILL_TREE.natureza.length).toBeGreaterThanOrEqual(3);
    expect(skillBranchOf('nat_root')).toBe('natureza');
  });

  it('só desbloqueia com pontos suficientes', () => {
    const g = makeGame(0);
    expect(canUnlock(g, 'nat_root')).toBe(false);
    expect(unlock(g, 'nat_root')).toBe(false);
    g.progress.skillPoints = 1;
    expect(canUnlock(g, 'nat_root')).toBe(true);
    expect(unlock(g, 'nat_root')).toBe(true);
    expect(isUnlocked(g, 'nat_root')).toBe(true);
    expect(g.progress.skillPoints).toBe(0);
  });

  it('respeita o pré-requisito do ramo', () => {
    const g = makeGame(5);
    // thorn exige root primeiro
    expect(canUnlock(g, 'nat_thorn')).toBe(false);
    unlock(g, 'nat_root');
    expect(canUnlock(g, 'nat_thorn')).toBe(true);
    unlock(g, 'nat_thorn');
    // meteoro custa 2 e exige thorn
    expect(isUnlocked(g, 'nat_thorn')).toBe(true);
    expect(canUnlock(g, 'nat_meteor')).toBe(true);
    unlock(g, 'nat_meteor');
    expect(g.progress.skillPoints).toBe(5 - 1 - 1 - 2);
  });

  it('não desbloqueia o mesmo nó duas vezes', () => {
    const g = makeGame(3);
    unlock(g, 'nat_root');
    expect(canUnlock(g, 'nat_root')).toBe(false);
    expect(g.progress.skillPoints).toBe(2);
  });

  it('lista as habilidades desbloqueadas p/ a hotbar', () => {
    const g = makeGame(3);
    unlock(g, 'nat_root');
    unlock(g, 'ice_lance');
    const abils = unlockedAbilities(g).sort();
    expect(abils).toContain('root_spikes');
    expect(abils).toContain('ice_lance');
    expect(abils.length).toBe(2);
  });

  it('respec devolve os pontos e zera os desbloqueios', () => {
    const g = makeGame(4);
    unlock(g, 'nat_root'); // 1
    unlock(g, 'nat_thorn'); // 1
    expect(g.progress.skillPoints).toBe(2);
    const refunded = respecActive(g);
    expect(refunded).toBe(2);
    expect(g.progress.skillPoints).toBe(4);
    expect(unlockedAbilities(g).length).toBe(0);
  });

  it('ensureActiveSkills cria o estado em save antigo', () => {
    const g: any = { progress: {} };
    ensureActiveSkills(g);
    expect(g.progress.activeSkills).toEqual({});
    expect(g.progress.skillPoints).toBe(0);
  });
});
