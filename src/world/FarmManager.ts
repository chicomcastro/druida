import * as THREE from 'three';
import { C, Transform } from '../core/ecs/components.js';
import { CROPS, tickFarming, plotState, plotProgress, plotStage, plotReady, grantStarterSeeds } from '../gameplay/farming.js';

/**
 * Plantação no mundo (E20.2): transforma os canteiros da praça numa horta
 * funcional. Cada canteiro é uma entidade interativa (`kind:'plot'`) com um id
 * estável — o estado de plantio (o que tem, quanto cresceu) vive em
 * `game.progress.plots` (E20.1), então persiste no save. Este manager só cuida
 * da view: constrói o canteiro, avança o crescimento por frame e reflete o
 * estágio no visual (terra → broto → maduro) e no prompt.
 */

/** Cor do fruto por cultura (para o canteiro maduro). */
const CROP_COLOR: Record<string, number> = {
  erva: 0x6fae4f, cenoura: 0xe08a3a, cogumelo: 0xd05a5a,
};

export class FarmManager {
  game: any;
  plots: any[];

  constructor(game) {
    this.game = game;
    this.plots = [];
    grantStarterSeeds(game); // dá o que semear na primeira horta
    // Canteiros da Clareira (a plantaçãozinha da praça — ADR 0111). Cada vila
    // druida ganha os dois canteiros onde antes havia só ervas decorativas.
    for (const s of game.settlements?.list ?? []) {
      if (s.theme !== 'druida') continue;
      const beds = [[-5, 5], [5, -5]];
      beds.forEach(([ox, oz], i) => this._spawnPlot(`${s.id}:plot${i}`, s.x + ox, s.z + oz));
    }
  }

  _spawnPlot(id, x, z) {
    const { game } = this;
    const g = new THREE.Group();
    const box = (w, h, d, color, y, opts: any = {}) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, ...opts }));
      m.position.y = y; g.add(m); return m;
    };
    box(1.8, 0.3, 1.8, 0x4a3424, 0.15); // canteiro de terra arada
    // Sulcos de terra (leiras) para leitura de "horta".
    for (const sx of [-0.5, 0.5]) box(0.35, 0.12, 1.5, 0x3a2a1c, 0.2).position.x = sx;
    const sprout = box(0.5, 1.0, 0.5, 0x7ac86a, 0.5); // broto (escala/altura por estágio)
    const fruit = box(0.34, 0.34, 0.34, 0xffffff, 1.1, { emissive: 0x000000 }); // fruto (só quando maduro)
    g.position.set(x, 0, z);
    game.renderer.add(g);
    const eid = game.world.createEntity();
    game.world.add(eid, C.Transform, Transform(x, z));
    game.world.add(eid, C.Renderable, { object3d: g, baseScale: 1 });
    game.world.add(eid, C.Interactable, { kind: 'plot', plotId: id, prompt: '🌱 E — Plantar', range: 2.4, used: false });
    this.plots.push({ id, eid, x, z, sprout, fruit });
    this._refresh(this.plots[this.plots.length - 1]);
  }

  /** Atualiza o visual (broto/fruto) e o prompt de um canteiro pelo estado. */
  _refresh(p) {
    const { game } = this;
    const st = plotState(game, p.id);
    const inter = game.world.get(p.eid, C.Interactable);
    if (!st) {
      p.sprout.visible = false; p.fruit.visible = false;
      if (inter) inter.prompt = '🌱 E — Plantar';
      return;
    }
    const crop = CROPS[st.crop];
    const prog = plotProgress(game, p.id);
    const ready = plotReady(game, p.id);
    const col = CROP_COLOR[st.crop] ?? 0x7ac86a;
    p.sprout.visible = true;
    p.sprout.scale.y = 0.3 + 0.7 * prog; // cresce em altura
    p.sprout.position.y = 0.5 * p.sprout.scale.y;
    (p.sprout.material as any).color.setHex(ready ? col : 0x7ac86a);
    p.fruit.visible = ready;
    if (ready) { (p.fruit.material as any).color.setHex(col); (p.fruit.material as any).emissive.setHex(col); (p.fruit.material as any).emissiveIntensity = 0.35; }
    if (inter) {
      inter.prompt = ready
        ? `${crop?.icon ?? '🌾'} E — Colher ${crop?.name ?? ''}`
        : `${crop?.icon ?? '🌱'} crescendo ${(prog * 100).toFixed(0)}%`;
    }
  }

  update(dt) {
    if (this.game.inDungeon) { tickFarming(this.game, dt); return; } // cresce mesmo fora da vila
    tickFarming(this.game, dt);
    for (const p of this.plots) this._refresh(p);
  }
}
