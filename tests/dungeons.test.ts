import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { DungeonManager } from '../src/world/DungeonManager.js';
import { DUNGEON_THEMES } from '../src/data/dungeons.js';
import { BIOMES, BIOME_ORDER } from '../src/data/biomes.js';
import { biomeAt } from '../src/world/WorldManager.js';

function enterFirst(g) {
  const dm = new DungeonManager(g);
  g.dungeon = dm;
  dm.enter(dm.entrances[0].id);
  return dm;
}

describe('temas de masmorra (dados)', () => {
  it('todo bioma tem tema com mini-chefe e clima', () => {
    for (const b of BIOME_ORDER) {
      const t = DUNGEON_THEMES[b];
      expect(t, b).toBeTruthy();
      expect(t.miniboss.name.length).toBeGreaterThan(0);
      expect(t.mood.fogFar).toBeGreaterThan(t.mood.fogNear);
      if (t.hazard) expect(t.hazard.interval).toBeGreaterThan(1);
    }
  });
});

describe('DungeonManager temático', () => {
  it('entrar aplica o tema do bioma da entrada (paleta + clima + nome)', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    const dm = enterFirst(g);
    const biome = biomeAt(dm.entrances[0].x, dm.entrances[0].z);
    expect(dm.active.theme).toBe(DUNGEON_THEMES[biome]);
    expect(dm._floorMat.color.getHex()).toBe(DUNGEON_THEMES[biome].floor);
    const obj: any = g.events.filter((e) => e.e === 'objective').at(-1);
    expect(obj.p.text).toContain(DUNGEON_THEMES[biome].name);
  });

  it('ondas usam o pool do bioma e a final traz o mini-chefe temático', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 0);
    const spawned: string[] = [];
    const orig = g.spawnEnemyByKey.bind(g);
    g.spawnEnemyByKey = (key, x, z) => { spawned.push(key); return orig(key, x, z); };
    const dm = enterFirst(g);
    const validKeys = BIOMES[dm.active.biome].enemies.map((e) => e.key);

    dm._spawnWave(); // onda 1
    expect(spawned.length).toBeGreaterThan(0);
    for (const k of spawned) expect(validKeys).toContain(k);

    dm.active.wave = 1; // força a próxima a ser a final
    dm._spawnWave();
    const bosses = [...g.world.query(C.Boss)];
    expect(bosses.length).toBe(1);
    expect(bosses[0][1].name).toBe(dm.active.theme.miniboss.name);
    expect(bosses[0][1].miniBoss).toBe(true);
    // O mini-chefe conta como inimigo da onda (precisa morrer para vencer).
    expect(dm.active.enemies).toContain(bosses[0][0]);
  });

  it('perigo ambiental telegrafado aplica dano + status do tema', () => {
    const g = makeGame();
    const pid = addPlayer(g, 0, 0, 1000); // centro da arena
    const dm = enterFirst(g);
    // Injeta um tema com hazard determinístico (raio cobre a arena toda).
    dm.active.theme = { ...dm.active.theme, hazard: { interval: 1, radius: 40, damage: 5, effect: { root: 1 }, color: 0xffffff, label: 'perigo!' } };
    dm.active.hazardT = 0;
    dm.rng = () => 0; // ponto do perigo no centro
    g.world.get(pid, C.Health).invuln = 0;
    const hpBefore = g.world.get(pid, C.Health).hp;
    dm.update(0.016); // agenda o golpe
    g.tickScheduled(1.2); // resolve o telegraph
    expect(g.world.get(pid, C.Health).hp).toBeLessThan(hpBefore);
    expect(g.world.get(pid, C.StatusEffects).root).toBeGreaterThan(0);
  });

  it('tema sem hazard não agenda perigo', () => {
    const g = makeGame();
    addPlayer(g, 0, 0, 1000);
    const dm = enterFirst(g);
    dm.active.theme = { ...dm.active.theme, hazard: null };
    const scheduled = g._scheduled.length;
    dm.update(10);
    expect(g._scheduled.length).toBe(scheduled);
  });
});
