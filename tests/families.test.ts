import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { InteriorManager } from '../src/world/InteriorManager.js';
import { interactionSystem } from '../src/systems/interaction.js';
import { FAMILIES, family } from '../src/data/families.js';
import { LORE, revealLore } from '../src/data/lore.js';
import { INTERIOR_THEMES } from '../src/data/interiors.js';

describe('Famílias e rixa (ADR 0095)', () => {
  it('há duas famílias e cada fofoca acusa a outra', () => {
    expect(Object.keys(FAMILIES)).toEqual(['fenwick', 'aldren']);
    expect(FAMILIES.fenwick.gossip).toMatch(/Aldren/);
    expect(FAMILIES.aldren.gossip).toMatch(/Fenwick/);
    expect(family('fenwick')?.name).toBe('Fenwick');
    expect(family(undefined)).toBe(null);
  });

  it('o codex ganhou os fragmentos da rixa', () => {
    for (const id of ['l13', 'l14', 'l15']) expect(LORE.some((l) => l.id === id)).toBe(true);
  });

  it('NPCs dos interiores carregam família e fragmento do codex', () => {
    expect(INTERIOR_THEMES.weapons.family).toBe('fenwick');
    expect(INTERIOR_THEMES.armor.family).toBe('aldren');
    expect(INTERIOR_THEMES.weapons.loreId).toBe('l13');
    expect(INTERIOR_THEMES.leader.loreId).toBe('l15');
  });
});

describe('revealLore', () => {
  it('revela uma vez, ignora repetição e emite o aviso', () => {
    const g = makeGame();
    expect(revealLore(g, 'l13')).toBe(true);
    expect(g.lore.found.has('l13')).toBe(true);
    expect(revealLore(g, 'l13')).toBe(false); // já descoberto
    expect(g.events.some((e) => e.e === 'loreFound')).toBe(true);
  });
});

describe('Conversa revela segredo da rixa', () => {
  function talkTo(themeId: string) {
    const g = makeGame();
    const im = new InteriorManager(g);
    g.interiors = im;
    g.menus = { openShop() {}, openStash() {} };
    const pid = addPlayer(g, 0);
    im.enter(themeId);
    // Cola o jogador no NPC e pressiona E.
    const ntr = g.world.get(im.active.npcId, C.Transform);
    const ptr = g.world.get(pid, C.Transform);
    ptr.x = ntr.x; ptr.z = ntr.z;
    g.world.get(pid, C.Intent).interact = true;
    interactionSystem(g, 0.016);
    return g;
  }

  it('armeiro (loja) mostra a fofoca e revela l13', () => {
    const g = talkTo('weapons');
    expect(g.lore.found.has('l13')).toBe(true);
    expect(g.events.some((e) => e.e === 'dialogue')).toBe(true);
  });

  it('liderança (talk) revela l15', () => {
    const g = talkTo('leader');
    expect(g.lore.found.has('l15')).toBe(true);
  });
});
