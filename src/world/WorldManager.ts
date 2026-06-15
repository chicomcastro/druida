import * as THREE from 'three';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { BIOMES } from '../data/biomes.js';
import { makeRng } from '../utils/math.js';
import { createLootOrb } from '../entities/factories.js';

/**
 * Mundo aberto: zonas de bioma dispostas em anéis concêntricos a partir do
 * hub (origem), criando um gradiente natural de dificuldade ao se afastar.
 * Props (árvores/rochas) são gerados em anel ao redor do grupo e descartados
 * ao se distanciar — pseudo-streaming. Ver docs/adr/0008-open-world.md.
 */
const RING_RADII = [
  { biome: 'clareira', max: 55 },
  { biome: 'pantano', max: 110 },
  { biome: 'bosque_cinza', max: 165 },
  { biome: 'picos', max: 220 },
  { biome: 'coracao', max: Infinity },
];

export function biomeAt(x, z) {
  const r = Math.hypot(x, z);
  for (const ring of RING_RADII) if (r <= ring.max) return ring.biome;
  return 'coracao';
}

export class WorldManager {
  [key: string]: any;
  constructor(game) {
    this.game = game;
    this.rng = makeRng(game.seed ?? 1337);
    this.currentBiome = 'clareira';
    this.props = []; // { id, x, z }
    this.spawnRadius = 34;
    this.despawnRadius = 48;
    this.maxProps = 90;

    // Fog of war: células de grade exploradas (revela ao redor do grupo).
    this.fogCell = 14;
    this.explored = new Set();

    // Colhíveis (fragmentos de essência espalhados pelo mundo).
    this.shards = [];
    this.maxShards = 12;

    // Chão grande recolorido conforme o bioma.
    this.groundMat = new THREE.MeshStandardMaterial({ color: BIOMES.clareira.ground, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    game.renderer.add(ground);

    this._initInstancedProps();
    this._buildHub();
    game.renderer.setBiomeMood(BIOMES.clareira);
  }

  /**
   * Pools de InstancedMesh para os props (tronco+folhas de árvore e rochas).
   * Um draw call por tipo em vez de um por prop. Cores por bioma via
   * instanceColor. Ver docs/adr/0015-performance.md.
   */
  _initInstancedProps() {
    const cap = this.maxProps + 16;
    this._dummy = new THREE.Object3D();
    const mk = (geo) => {
      const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), cap);
      inst.castShadow = true;
      inst.receiveShadow = true;
      inst.frustumCulled = false; // instâncias espalhadas; evita sumiço por culling
      this.game.renderer.add(inst);
      return inst;
    };
    this.trunkInst = mk(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 6));
    this.leafInst = mk(new THREE.IcosahedronGeometry(1.2, 0));
    this.rockInst = mk(new THREE.DodecahedronGeometry(0.8, 0));
    this._freeTree = [];
    this._freeRock = [];
    for (let i = 0; i < cap; i++) {
      this._freeTree.push(i);
      this._freeRock.push(i);
      this._hideInstance(this.trunkInst, i);
      this._hideInstance(this.leafInst, i);
      this._hideInstance(this.rockInst, i);
    }
    this._flushInstances();
  }

  _setInstance(inst, slot, x, y, z, rot, s, colorHex) {
    this._dummy.position.set(x, y, z);
    this._dummy.rotation.set(0, rot, 0);
    this._dummy.scale.setScalar(s);
    this._dummy.updateMatrix();
    inst.setMatrixAt(slot, this._dummy.matrix);
    if (colorHex !== undefined) {
      this._tmpColor = this._tmpColor ?? new THREE.Color();
      inst.setColorAt(slot, this._tmpColor.setHex(colorHex));
    }
  }

  _hideInstance(inst, slot) {
    this._dummy.position.set(0, -1000, 0);
    this._dummy.scale.setScalar(0);
    this._dummy.rotation.set(0, 0, 0);
    this._dummy.updateMatrix();
    inst.setMatrixAt(slot, this._dummy.matrix);
  }

  _flushInstances() {
    for (const inst of [this.trunkInst, this.leafInst, this.rockInst]) {
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
  }

  _buildHub() {
    // Carvalho-Mãe no centro do hub (marco visual + obstáculo).
    const { game } = this;
    const trunk = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 6, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2f }));
    t.position.y = 3; t.castShadow = true;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(4.5, 0), new THREE.MeshStandardMaterial({ color: 0x4f8f3f }));
    crown.position.y = 8; crown.castShadow = true;
    trunk.add(t); trunk.add(crown);
    trunk.position.set(0, 0, -10);
    game.renderer.add(trunk);
    // Obstáculo do tronco.
    const id = game.world.createEntity();
    game.world.add(id, C.Transform, Transform(0, -10));
    game.world.add(id, C.Collider, Collider(1.8, true));
  }

  _spawnProp(x, z, biome) {
    const { game } = this;
    const def = BIOMES[biome];
    const rot = this.rng() * Math.PI * 2;
    let rec;
    if (this.rng.chance(0.7) && this._freeTree.length) {
      const slot = this._freeTree.pop();
      const s = 0.8 + this.rng() * 0.5;
      this._setInstance(this.trunkInst, slot, x, 1.1 * s, z, rot, s, 0x4a3424);
      this._setInstance(this.leafInst, slot, x, 2.6 * s, z, rot, s, def.propColor);
      const id = game.world.createEntity();
      game.world.add(id, C.Transform, Transform(x, z));
      game.world.add(id, C.Collider, Collider(0.5, true));
      rec = { id, x, z, type: 'tree', slot };
    } else if (this._freeRock.length) {
      const slot = this._freeRock.pop();
      const s = 0.7 + this.rng() * 0.6;
      this._setInstance(this.rockInst, slot, x, 0.5 * s, z, rot, s, 0x6b6b6b);
      const id = game.world.createEntity();
      game.world.add(id, C.Transform, Transform(x, z));
      game.world.add(id, C.Collider, Collider(0.7 * s, true));
      rec = { id, x, z, type: 'rock', slot };
    } else {
      return; // sem slot livre
    }
    this._flushInstances();
    this.props.push(rec);
  }

  _despawnProp(rec) {
    if (rec.type === 'tree') {
      this._hideInstance(this.trunkInst, rec.slot);
      this._hideInstance(this.leafInst, rec.slot);
      this._freeTree.push(rec.slot);
    } else {
      this._hideInstance(this.rockInst, rec.slot);
      this._freeRock.push(rec.slot);
    }
    this.game.world.destroyEntity(rec.id);
  }

  isExplored(x, z) {
    const cx = Math.round(x / this.fogCell);
    const cz = Math.round(z / this.fogCell);
    return this.explored.has(`${cx},${cz}`);
  }

  _revealAround(x, z) {
    const cx = Math.round(x / this.fogCell);
    const cz = Math.round(z / this.fogCell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) this.explored.add(`${cx + dx},${cz + dz}`);
    }
  }

  update(dt) {
    const { game } = this;
    const c = game.groupCenter ?? { x: 0, z: 0 };
    this._revealAround(c.x, c.z);

    // Bioma atual -> clima/cor.
    const b = biomeAt(c.x, c.z);
    if (b !== this.currentBiome) {
      this.currentBiome = b;
      this.groundMat.color.setHex(BIOMES[b].ground);
      game.renderer.setBiomeMood(BIOMES[b]);
      game.emit('biomeChanged', { biome: b, def: BIOMES[b] });
    }

    // Descartar props distantes (libera o slot instanciado).
    let despawned = false;
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      if (Math.hypot(p.x - c.x, p.z - c.z) > this.despawnRadius) {
        this._despawnProp(p);
        this.props.splice(i, 1);
        despawned = true;
      }
    }
    if (despawned) this._flushInstances();

    // Gerar props novos no anel ao redor do grupo (longe do hub).
    let guard = 0;
    while (this.props.length < this.maxProps && guard++ < 8) {
      const a = this.rng() * Math.PI * 2;
      const rad = 14 + this.rng() * (this.spawnRadius - 14);
      const x = c.x + Math.sin(a) * rad;
      const z = c.z + Math.cos(a) * rad;
      if (Math.hypot(x, z) < 8) continue; // mantém o hub limpo
      this._spawnProp(x, z, biomeAt(x, z));
    }

    this._updateShards(c);
  }

  _updateShards(c) {
    const { game } = this;
    // Remove colhidos (entidade não existe mais) e os muito distantes.
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      if (!game.world.entities.has(s.id)) { this.shards.splice(i, 1); continue; }
      if (Math.hypot(s.x - c.x, s.z - c.z) > this.despawnRadius + 12) {
        const r = game.world.get(s.id, C.Renderable);
        if (r) game.renderer.remove(r.object3d);
        game.world.destroyEntity(s.id);
        this.shards.splice(i, 1);
      }
    }
    // Gera novos no anel, fora do hub.
    if (this.shards.length < this.maxShards && this.rng.chance(0.04)) {
      const a = this.rng() * Math.PI * 2;
      const rad = 16 + this.rng() * (this.spawnRadius - 16);
      const x = c.x + Math.sin(a) * rad;
      const z = c.z + Math.cos(a) * rad;
      if (Math.hypot(x, z) < 12) return;
      const id = createLootOrb(game.world, game.renderer, { x, z, item: { essence: 4 + Math.floor(this.rng() * 4), rarityColor: 0x9fe06a } });
      this.shards.push({ id, x, z });
    }
  }
}
