import { describe, it, expect } from 'vitest';
import { unlock } from '../src/gameplay/skillTree.js';
import {
  HOTBAR_SIZE, ensureHotbar, hotbarAbility, assignSkill, clearSlot,
  autoFillHotbar, pruneHotbar,
} from '../src/gameplay/hotbar.js';

function makeGame(points = 0): any {
  return { progress: { skillPoints: points }, emit: () => {} };
}
function withSkills(points = 5) {
  const g = makeGame(points);
  unlock(g, 'nat_root');   // root_spikes
  unlock(g, 'ice_lance');  // ice_lance
  return g;
}

describe('Hotbar 1–9 (E17.3)', () => {
  it('cria 9 slots vazios em save antigo', () => {
    const g: any = { progress: {}, emit: () => {} };
    const hb = ensureHotbar(g);
    expect(hb.length).toBe(HOTBAR_SIZE);
    expect(hb.every((s: any) => s === null)).toBe(true);
  });

  it('só atribui habilidade liberada e existente', () => {
    const g = withSkills();
    expect(assignSkill(g, 0, 'root_spikes')).toBe(true);
    expect(hotbarAbility(g, 0)).toBe('root_spikes');
    // não liberada
    expect(assignSkill(g, 1, 'meteor_sap')).toBe(false);
    // inexistente
    expect(assignSkill(g, 1, 'nao_existe')).toBe(false);
    expect(hotbarAbility(g, 1)).toBe(null);
  });

  it('não duplica: mover a mesma skill limpa o slot antigo', () => {
    const g = withSkills();
    assignSkill(g, 0, 'root_spikes');
    assignSkill(g, 3, 'root_spikes');
    expect(hotbarAbility(g, 0)).toBe(null);
    expect(hotbarAbility(g, 3)).toBe('root_spikes');
  });

  it('rejeita slots fora de faixa', () => {
    const g = withSkills();
    expect(assignSkill(g, -1, 'root_spikes')).toBe(false);
    expect(assignSkill(g, 9, 'root_spikes')).toBe(false);
    expect(hotbarAbility(g, 99)).toBe(null);
  });

  it('clearSlot esvazia', () => {
    const g = withSkills();
    assignSkill(g, 2, 'ice_lance');
    expect(clearSlot(g, 2)).toBe(true);
    expect(hotbarAbility(g, 2)).toBe(null);
  });

  it('autoFill coloca as liberadas nos vazios, sem duplicar', () => {
    const g = withSkills();
    const placed = autoFillHotbar(g);
    expect(placed).toBe(2);
    const filled = ensureHotbar(g).filter(Boolean).sort();
    expect(filled).toEqual(['ice_lance', 'root_spikes']);
    // rodar de novo não recoloca
    expect(autoFillHotbar(g)).toBe(0);
  });

  it('prune remove skills que não estão mais liberadas', () => {
    const g = withSkills();
    autoFillHotbar(g);
    g.progress.activeSkills = {}; // respec bruto
    pruneHotbar(g);
    expect(ensureHotbar(g).every((s) => s === null)).toBe(true);
  });
});
