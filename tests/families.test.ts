import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { InteriorManager } from '../src/world/InteriorManager.js';
import { interactionSystem } from '../src/systems/interaction.js';
import { FAMILIES, family, familiesOf } from '../src/data/families.js';
import { LORE, revealLore } from '../src/data/lore.js';
import { INTERIOR_THEMES } from '../src/data/interiors.js';

describe('Famílias e rixa (ADR 0095)', () => {
  it('a Clareira tem duas famílias e cada fofoca acusa a outra', () => {
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

describe('Rixas das vilas 2–4 (ADR 0107)', () => {
  it('cada uma das 4 vilas tem exatamente duas famílias rivais', () => {
    for (const s of ['circulo_carvalho', 'vau_palafitas', 'cinzafolha', 'abrigo_degelo']) {
      const pair = familiesOf(s);
      expect(pair.length).toBe(2);
      // a fofoca de cada família cita o sobrenome da outra
      expect(pair[0].gossip).toMatch(new RegExp(pair[1].name));
      expect(pair[1].gossip).toMatch(new RegExp(pair[0].name));
    }
  });

  it('cada família nova tem uma loja com viés e um fragmento do codex', () => {
    const shops = [
      ['vau_arpo', 'vison', 'weapon', 'l16'], ['vau_couro', 'canico', 'armor', 'l17'],
      ['cinza_serra', 'cerne', 'weapon', 'l18'], ['cinza_forno', 'brasa', 'armor', 'l19'],
      ['degelo_trilha', 'cairn', 'weapon', 'l20'], ['degelo_pasto', 'velo', 'armor', 'l21'],
    ];
    for (const [theme, fam, bias, lore] of shops) {
      const t = INTERIOR_THEMES[theme];
      expect(t.service).toBe('shop');
      expect(t.family).toBe(fam);
      expect(t.shopBias).toBe(bias);
      expect(t.loreId).toBe(lore);
      expect(LORE.some((l) => l.id === lore)).toBe(true);
    }
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
