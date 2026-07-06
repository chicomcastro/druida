import { describe, it, expect } from 'vitest';
import { unlock } from '../src/gameplay/skillTree.js';
import {
  HOTBAR_SIZE, ensureHotbar, hotbarEntry, hotbarAbility, assignSkill, assignForm,
  assignPotion, clearSlot, autoFillHotbar, pruneHotbar, seedForms, sameEntry, placeEntry,
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

describe('Hotbar livre — entradas tipadas (E18)', () => {
  it('cria 9 slots vazios em save sem hotbar', () => {
    const g: any = { progress: {}, emit: () => {} };
    const hb = ensureHotbar(g);
    expect(hb.length).toBe(HOTBAR_SIZE);
    expect(hb.every((s: any) => s === null)).toBe(true);
  });

  it('migra save antigo (array de ids de habilidade) para entradas skill', () => {
    const g: any = { progress: { hotbar: ['root_spikes', null, 'ice_lance', null, null, null, null, null, null] }, emit: () => {} };
    const hb = ensureHotbar(g);
    expect(hb[0]).toEqual({ k: 'skill', id: 'root_spikes' });
    expect(hb[2]).toEqual({ k: 'skill', id: 'ice_lance' });
    expect(hb[1]).toBe(null);
  });

  it('só atribui habilidade liberada e existente', () => {
    const g = withSkills();
    expect(assignSkill(g, 0, 'root_spikes')).toBe(true);
    expect(hotbarAbility(g, 0)).toBe('root_spikes');
    expect(hotbarEntry(g, 0)).toEqual({ k: 'skill', id: 'root_spikes' });
    expect(assignSkill(g, 1, 'meteor_sap')).toBe(false); // não liberada
    expect(assignSkill(g, 1, 'nao_existe')).toBe(false); // inexistente
    expect(hotbarAbility(g, 1)).toBe(null);
  });

  it('não duplica: mover a mesma entrada limpa o slot antigo', () => {
    const g = withSkills();
    assignSkill(g, 0, 'root_spikes');
    assignSkill(g, 3, 'root_spikes');
    expect(hotbarEntry(g, 0)).toBe(null);
    expect(hotbarAbility(g, 3)).toBe('root_spikes');
  });

  it('tipos convivem: skill, forma e poção em slots diferentes', () => {
    const g = withSkills();
    assignSkill(g, 0, 'ice_lance');
    assignForm(g, 1, 'wolf');
    assignPotion(g, 2, 'Seiva Vital');
    expect(hotbarEntry(g, 0)).toEqual({ k: 'skill', id: 'ice_lance' });
    expect(hotbarEntry(g, 1)).toEqual({ k: 'form', id: 'wolf' });
    expect(hotbarEntry(g, 2)).toEqual({ k: 'potion', id: 'Seiva Vital' });
  });

  it('hotbarAbility só devolve id de skill (forma/poção → null)', () => {
    const g = withSkills();
    assignForm(g, 4, 'wolf');
    assignPotion(g, 5, 'Seiva Vital');
    expect(hotbarAbility(g, 4)).toBe(null);
    expect(hotbarAbility(g, 5)).toBe(null);
  });

  it('rejeita slots fora de faixa', () => {
    const g = withSkills();
    expect(assignSkill(g, -1, 'root_spikes')).toBe(false);
    expect(assignSkill(g, 9, 'root_spikes')).toBe(false);
    expect(hotbarEntry(g, 99)).toBe(null);
  });

  it('clearSlot esvazia', () => {
    const g = withSkills();
    assignSkill(g, 2, 'ice_lance');
    expect(clearSlot(g, 2)).toBe(true);
    expect(hotbarEntry(g, 2)).toBe(null);
  });

  it('sameEntry compara tipo + id', () => {
    expect(sameEntry({ k: 'skill', id: 'a' }, { k: 'skill', id: 'a' })).toBe(true);
    expect(sameEntry({ k: 'skill', id: 'a' }, { k: 'form', id: 'a' })).toBe(false);
    expect(sameEntry(null, { k: 'skill', id: 'a' })).toBe(false);
  });
});

describe('seed de formas + autofill (E18)', () => {
  it('seedForms coloca as formas a partir do slot 4 (teclas 5, 6, …)', () => {
    const g = makeGame();
    seedForms(g, ['humanoid', 'wolf']);
    expect(hotbarEntry(g, 4)).toEqual({ k: 'form', id: 'humanoid' });
    expect(hotbarEntry(g, 5)).toEqual({ k: 'form', id: 'wolf' });
  });

  it('seedForms não duplica forma já presente', () => {
    const g = makeGame();
    assignForm(g, 0, 'wolf');
    seedForms(g, ['wolf']);
    const count = ensureHotbar(g).filter((e) => e && e.k === 'form' && e.id === 'wolf').length;
    expect(count).toBe(1);
  });

  it('placeEntry usa o 1º slot vago e devolve o índice', () => {
    const g = makeGame();
    const i = placeEntry(g, { k: 'form', id: 'bear' });
    expect(i).toBe(0);
    expect(hotbarEntry(g, 0)).toEqual({ k: 'form', id: 'bear' });
  });

  it('autoFill coloca as skills liberadas nos vazios, sem duplicar', () => {
    const g = withSkills();
    const placed = autoFillHotbar(g);
    expect(placed).toBe(2);
    const ids = ensureHotbar(g).filter((e) => e && e.k === 'skill').map((e) => e!.id).sort();
    expect(ids).toEqual(['ice_lance', 'root_spikes']);
    expect(autoFillHotbar(g)).toBe(0); // rodar de novo não recoloca
  });
});

describe('prune de entradas órfãs (E18)', () => {
  it('remove skills não mais liberadas', () => {
    const g = withSkills();
    autoFillHotbar(g);
    g.progress.activeSkills = {}; // respec bruto
    pruneHotbar(g);
    expect(ensureHotbar(g).every((s) => s === null)).toBe(true);
  });

  it('remove formas fora da lista quando `forms` é passado', () => {
    const g = withSkills();
    assignForm(g, 0, 'wolf');
    assignForm(g, 1, 'bear');
    pruneHotbar(g, { forms: ['wolf'] });
    expect(hotbarEntry(g, 0)).toEqual({ k: 'form', id: 'wolf' });
    expect(hotbarEntry(g, 1)).toBe(null);
  });

  it('remove equipamentos não possuídos quando `ownedUids` é passado', () => {
    const g = withSkills();
    ensureHotbar(g)[0] = { k: 'equip', id: 42 };
    ensureHotbar(g)[1] = { k: 'equip', id: 99 };
    pruneHotbar(g, { ownedUids: new Set([42]) });
    expect(hotbarEntry(g, 0)).toEqual({ k: 'equip', id: 42 });
    expect(hotbarEntry(g, 1)).toBe(null);
  });
});
