import * as THREE from 'three';
import { C, Transform } from '../core/ecs/components.js';
import { makeRng } from '../utils/math.js';
import { biomeAt } from './WorldManager.js';
import { forageOf, addIngredient } from '../gameplay/ingredients.js';
import { rollForageSeed, addSeed, CROPS } from '../gameplay/farming.js';

/**
 * Forrageamento (E19.3): nós de coleta espalhados pelo mundo por bioma —
 * ervas, cenouras, cogumelos, peixe, bagas… O jogador se aproxima e colhe (E),
 * ganhando o ingrediente na despensa; o nó reaparece depois de um tempo.
 *
 * Espalha em anéis a partir da origem (como os acampamentos, ADR 0017),
 * evitando os assentamentos, e escolhe o ingrediente pelo bioma do ponto.
 */

const RESPAWN = 60; // s até o nó voltar

/** Cor do "fruto"/item no nó, por ingrediente (fallback verde). */
const NODE_COLOR: Record<string, number> = {
  erva: 0x6fae4f, cenoura: 0xe08a3a, cogumelo: 0xd05a5a, peixe: 0x8ad0ff,
  junco: 0x9fd06a, baga_gelada: 0x6a7ad0, pimenta: 0xd83a2a, mel: 0xe8b23a,
};

export class ForageManager {
  game: any;
  nodes: any[];

  constructor(game) {
    this.game = game;
    this.nodes = [];
    this._scatter((game.seed ?? 1337) ^ 0xf00d);
  }

  _scatter(seed) {
    const rng = makeRng(seed >>> 0);
    // Anéis por faixa de progressão (mesma lógica dos acampamentos).
    const rings = [
      { rmin: 16, rmax: 46, count: 6 },
      { rmin: 52, rmax: 104, count: 7 },
      { rmin: 112, rmax: 160, count: 7 },
      { rmin: 168, rmax: 220, count: 6 },
    ];
    let n = 0;
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        let x = 0, z = 0, ok = false;
        for (let t = 0; t < 10; t++) {
          const ang = rng.range(0, Math.PI * 2);
          const rad = rng.range(ring.rmin, ring.rmax);
          x = Math.sin(ang) * rad; z = Math.cos(ang) * rad;
          if (!this.game.settlements?.isSafe?.(x, z, 8)) { ok = true; break; }
        }
        if (!ok) continue;
        const opts = forageOf(biomeAt(x, z));
        if (!opts.length) continue;
        const def = opts[Math.floor(rng() * opts.length)];
        this._spawnNode(`forage${n++}`, x, z, def);
      }
    }
  }

  _spawnNode(id, x, z, def) {
    const { game } = this;
    const mesh = this._nodeMesh(def);
    mesh.position.set(x, 0, z);
    game.renderer.add(mesh);
    const eid = game.world.createEntity();
    game.world.add(eid, C.Transform, Transform(x, z));
    game.world.add(eid, C.Renderable, { object3d: mesh, baseScale: 1 });
    game.world.add(eid, C.Interactable, {
      kind: 'forage', ingredient: def.id, prompt: `${def.icon} E — Colher ${def.name}`, range: 2.4, used: false,
    });
    this.nodes.push({ id, eid, x, z, def, mesh, respawn: 0 });
  }

  /** Colhe um nó (chamado pelo interactionSystem). */
  collect(eid) {
    const node = this.nodes.find((n) => n.eid === eid);
    if (!node) return;
    const inter = this.game.world.get(eid, C.Interactable);
    if (!inter || inter.used) return;
    addIngredient(this.game, node.def.id, 1);
    inter.used = true;
    node.mesh.visible = false;
    node.respawn = RESPAWN;
    // Chance de vir uma semente junto (E21.1): dá pra plantar o que se colhe.
    const seedCrop = rollForageSeed(node.def.id, Math.random());
    if (seedCrop) {
      addSeed(this.game, seedCrop, 1);
      this.game.emit('objective', { text: `${node.def.icon} +1 ${node.def.name} · ${CROPS[seedCrop].seedIcon} +1 ${CROPS[seedCrop].seedName}!` });
    } else {
      this.game.emit('objective', { text: `${node.def.icon} +1 ${node.def.name} (colhido)` });
    }
  }

  update(dt) {
    for (const node of this.nodes) {
      if (node.respawn > 0) {
        node.respawn -= dt;
        if (node.respawn <= 0) {
          node.mesh.visible = true;
          const inter = this.game.world.get(node.eid, C.Interactable);
          if (inter) inter.used = false;
        }
      }
    }
  }

  /** Moita voxel simples: folhas verdes + 3 "frutos" na cor do ingrediente. */
  _nodeMesh(def) {
    const g = new THREE.Group();
    const box = (w, h, d, color, x, y, z, opts: any = {}) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, ...opts }));
      m.position.set(x, y, z); g.add(m); return m;
    };
    box(0.9, 0.4, 0.9, 0x3a5a2f, 0, 0.2, 0); // moita/folhagem base
    box(0.6, 0.5, 0.6, 0x4a6f3a, 0, 0.5, 0);
    const c = NODE_COLOR[def.id] ?? 0x8fe0a0;
    box(0.2, 0.2, 0.2, c, -0.22, 0.72, 0.1, { emissive: c, emissiveIntensity: 0.35 });
    box(0.2, 0.2, 0.2, c, 0.2, 0.68, -0.15, { emissive: c, emissiveIntensity: 0.35 });
    box(0.18, 0.18, 0.18, c, 0.05, 0.9, 0.18, { emissive: c, emissiveIntensity: 0.35 });
    return g;
  }
}
