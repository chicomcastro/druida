import { describe, it, expect } from 'vitest';
import { makeGame } from './helpers.js';
import { PurityManager } from '../src/world/PurityManager.js';
import { WorldManager } from '../src/world/WorldManager.js';
import { PoiManager } from '../src/world/PoiManager.js';
import { BIOMES } from '../src/data/biomes.js';

describe('PurityManager', () => {
  it('deriva regiões purificadas do passo da história', () => {
    const g = makeGame();
    const pm = new PurityManager(g);
    g.purity = pm;
    pm.update();
    expect(pm.isPurified('clareira')).toBe(false);

    g.story.step = 4; // slay_miniboss concluído → find_raven
    pm.update();
    expect(pm.isPurified('clareira')).toBe(true);
    expect(pm.isPurified('pantano')).toBe(true);
    expect(pm.isPurified('bosque_cinza')).toBe(false);

    g.story.step = 7; // vitória
    pm.update();
    for (const b of ['clareira', 'pantano', 'bosque_cinza', 'picos', 'coracao']) {
      expect(pm.isPurified(b)).toBe(true);
    }
  });

  it('effectiveDef aplica o overlay purified (chão/luz/partículas)', () => {
    const g = makeGame();
    const pm = new PurityManager(g);
    expect(pm.effectiveDef('clareira').ground).toBe(BIOMES.clareira.ground);
    pm.purified.add('clareira');
    const def = pm.effectiveDef('clareira');
    expect(def.ground).toBe(BIOMES.clareira.purified.ground);
    expect(def.light.sunIntensity).toBe(BIOMES.clareira.purified.light.sunIntensity);
    // Campos não sobrescritos herdam da base.
    expect(def.ambient.sway).toBe(BIOMES.clareira.ambient.sway);
    expect(def.enemies).toBe(BIOMES.clareira.enemies);
  });

  it('anuncia a cura de região ao vivo (mas não na reconstrução do save)', () => {
    const g = makeGame();
    g.story.step = 2; // save carregado já com a Clareira limpa
    const pm = new PurityManager(g);
    pm.update(); // reconstrução: sem anúncio
    expect(g.events.filter((e) => e.e === 'regionPurified').length).toBe(0);
    g.story.step = 4; // progresso ao vivo
    pm.update();
    const purs = g.events.filter((e) => e.e === 'regionPurified');
    expect(purs.map((e) => e.p.biome)).toEqual(['pantano']);
  });

  it('acampamentos purificados florescem uma única vez (load e runtime)', () => {
    const g = makeGame();
    const pm = new PurityManager(g);
    g.settlements = { isSafe: () => false };
    const poi = new PoiManager(g);
    g.poi = poi;
    poi.camps[0].cleared = true; // como após load
    pm.update();
    expect(pm._bloomed.has(poi.camps[0].id)).toBe(true);
    const ringsAfterFirst = g.events.filter((e) => e.e === 'vfxRing').length;
    pm.update(); // idempotente
    expect(g.events.filter((e) => e.e === 'vfxRing').length).toBe(ringsAfterFirst);
    poi.camps[1].cleared = true; // purificado em jogo
    pm.update();
    expect(pm._bloomed.has(poi.camps[1].id)).toBe(true);
  });

  it('WorldManager usa a definição efetiva no clima e no chão', () => {
    const g = makeGame();
    const pm = new PurityManager(g);
    g.purity = pm;
    g.story.step = 7;
    pm.update();
    const wm = new WorldManager(g);
    g.worldManager = wm;
    g.groupCenter = { x: 0, z: 80 }; // pântano (purificado)
    wm.update(0.1);
    expect(wm.groundMat.color.getHex()).toBe(BIOMES.pantano.purified.ground);
    const changed: any = g.events.find((e) => e.e === 'biomeChanged' && e.p.biome === 'pantano');
    expect(changed.p.def.ground).toBe(BIOMES.pantano.purified.ground);
  });
});
