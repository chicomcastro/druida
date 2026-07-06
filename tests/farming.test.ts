import { describe, it, expect } from 'vitest';
import {
  CROPS, cropsAreValid, cropById,
  ensureSeeds, seedCount, addSeed, hasSeed, consumeSeed, seedList, grantStarterSeeds,
  plantPlot, plotState, plotProgress, plotStage, plotReady, tickFarming, harvestPlot,
} from '../src/gameplay/farming.js';
import { ingredientCount } from '../src/gameplay/ingredients.js';

function makeGame() {
  const events: any[] = [];
  return {
    progress: {},
    events,
    emit(name, payload) { events.push({ name, payload }); },
  } as any;
}

describe('farming — dados', () => {
  it('toda cultura rende um ingrediente válido, com tempo e rendimento positivos', () => {
    expect(cropsAreValid()).toBe(true);
    expect(cropById('cenoura')?.yields).toBe('cenoura');
    expect(cropById('inexistente')).toBeUndefined();
  });
});

describe('farming — sementes', () => {
  it('adiciona, conta e consome sementes; ignora cultura inválida', () => {
    const g = makeGame();
    expect(seedCount(g, 'erva')).toBe(0);
    addSeed(g, 'erva', 2);
    addSeed(g, 'nao_existe', 5); // ignorado
    expect(seedCount(g, 'erva')).toBe(2);
    expect(hasSeed(g, 'erva')).toBe(true);
    expect(consumeSeed(g, 'erva')).toBe(true);
    expect(seedCount(g, 'erva')).toBe(1);
    expect(seedList(g).find((s) => s.crop.id === 'erva')?.count).toBe(1);
  });

  it('sementes iniciais são dadas uma única vez', () => {
    const g = makeGame();
    grantStarterSeeds(g);
    grantStarterSeeds(g); // idempotente
    expect(seedCount(g, 'erva')).toBe(3);
    expect(seedCount(g, 'cenoura')).toBe(2);
  });
});

describe('farming — canteiros (plantar → crescer → colher)', () => {
  it('planta consumindo semente; não planta sem semente nem em canteiro ocupado', () => {
    const g = makeGame();
    addSeed(g, 'cenoura', 1);
    expect(plantPlot(g, 'p1', 'cenoura')).toBe(true);
    expect(plotState(g, 'p1')?.crop).toBe('cenoura');
    expect(seedCount(g, 'cenoura')).toBe(0);
    // Sem semente
    expect(plantPlot(g, 'p2', 'cenoura')).toBe(false);
    // Canteiro ocupado
    addSeed(g, 'erva', 1);
    expect(plantPlot(g, 'p1', 'erva')).toBe(false);
    expect(seedCount(g, 'erva')).toBe(1); // não consumiu
  });

  it('cresce com o tempo; estágio e progresso avançam; fica pronto no growTime', () => {
    const g = makeGame();
    addSeed(g, 'erva', 1);
    plantPlot(g, 'p1', 'erva');
    const gt = CROPS.erva.growTime;
    expect(plotProgress(g, 'p1')).toBe(0);
    expect(plotStage(g, 'p1')).toBe(0);
    expect(plotReady(g, 'p1')).toBe(false);
    tickFarming(g, gt / 2);
    expect(plotProgress(g, 'p1')).toBeCloseTo(0.5, 5);
    expect(plotStage(g, 'p1')).toBe(2);
    tickFarming(g, gt); // ultrapassa — capa no growTime
    expect(plotProgress(g, 'p1')).toBe(1);
    expect(plotStage(g, 'p1')).toBe(3);
    expect(plotReady(g, 'p1')).toBe(true);
    expect(g.events.some((e) => e.name === 'cropReady')).toBe(true);
  });

  it('colher só quando maduro: credita o ingrediente e esvazia o canteiro', () => {
    const g = makeGame();
    addSeed(g, 'cenoura', 1);
    plantPlot(g, 'p1', 'cenoura');
    expect(harvestPlot(g, 'p1')).toBe(null); // ainda verde
    tickFarming(g, CROPS.cenoura.growTime);
    const crop = harvestPlot(g, 'p1');
    expect(crop?.id).toBe('cenoura');
    expect(ingredientCount(g, 'cenoura')).toBe(CROPS.cenoura.yieldQty);
    expect(plotState(g, 'p1')).toBe(null); // canteiro livre de novo
  });
});
