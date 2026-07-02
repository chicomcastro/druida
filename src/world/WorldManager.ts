import * as THREE from 'three';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { BIOMES } from '../data/biomes.js';
import { makeRng } from '../utils/math.js';
import { createLootOrb } from '../entities/factories.js';
import { LORE } from '../data/lore.js';

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
  game: any;
  rng: any;
  currentBiome: string;
  props: any[]; shards: any[];
  spawnRadius: number; despawnRadius: number; maxProps: number; maxShards: number;
  fogCell: number;
  explored: Set<string>;
  groundMat: any;
  _dummy: any; _tmpColor?: any;
  trunkInst: any; leafInst: any; rockInst: any; detailInst: any;
  _freeTree: number[]; _freeRock: number[]; _freeDetail: number[];
  details: any[]; maxDetails: number;
  ambPoints: any; _ambPhase: Float32Array; _ambT: number;
  _loreActive: Set<string>;
  constructor(game) {
    this.game = game;
    this.rng = makeRng(game.seed ?? 1337);
    this.currentBiome = 'clareira';
    this.props = []; // { id, x, z }
    this.spawnRadius = 34;
    this.despawnRadius = 48;
    this.maxProps = 90;
    this.details = []; // vegetação rasteira (só visual, sem colisor)
    this.maxDetails = 220;

    // Fog of war: células de grade exploradas (revela ao redor do grupo).
    this.fogCell = 14;
    this.explored = new Set();

    // Colhíveis (fragmentos de essência espalhados pelo mundo).
    this.shards = [];
    this.maxShards = 12;

    // Chão grande recolorido conforme o bioma, com ruído sutil (quebra o
    // "chapado"; a textura vem do Renderer — nula em ambiente headless).
    const groundTex = game.renderer.groundTexture?.() ?? null;
    this.groundMat = new THREE.MeshStandardMaterial({ color: BIOMES.clareira.ground, roughness: 1, map: groundTex });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    game.renderer.add(ground);

    this._initInstancedProps();
    this._initAmbience();
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
    // Vegetação rasteira (tufos de grama/brotos): pool próprio, mais denso,
    // sem colisor nem entidade — puro detalhe visual do bioma.
    const detailCap = this.maxDetails + 16;
    this.detailInst = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.14, 0.55, 5),
      new THREE.MeshStandardMaterial({ roughness: 1 }),
      detailCap,
    );
    this.detailInst.receiveShadow = true;
    this.detailInst.frustumCulled = false;
    this.game.renderer.add(this.detailInst);
    this._freeDetail = [];
    for (let i = 0; i < detailCap; i++) {
      this._freeDetail.push(i);
      this._hideInstance(this.detailInst, i);
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
    for (const inst of [this.trunkInst, this.leafInst, this.rockInst, this.detailInst]) {
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Partículas atmosféricas por bioma (vagalumes, esporos, cinza, neve,
   * fagulhas): um único THREE.Points que deriva ao redor do grupo, com cor,
   * tamanho e direção definidos pelo bioma. Ver ADR 0042.
   */
  _initAmbience() {
    const N = 140;
    const pos = new Float32Array(N * 3);
    this._ambPhase = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (this.rng() - 0.5) * 64;
      pos[i * 3 + 1] = 0.3 + this.rng() * 6;
      pos[i * 3 + 2] = (this.rng() - 0.5) * 64;
      this._ambPhase[i] = this.rng() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const def = BIOMES[this.currentBiome].ambient;
    const mat = new THREE.PointsMaterial({
      color: def.color, size: def.size, transparent: true, opacity: def.opacity,
      depthWrite: false, sizeAttenuation: true,
    });
    this.ambPoints = new THREE.Points(geo, mat);
    this.ambPoints.frustumCulled = false;
    this.game.renderer.add(this.ambPoints);
  }

  _updateAmbience(dt, c) {
    const def = BIOMES[this.currentBiome].ambient;
    if (!def || !this.ambPoints) return;
    const attr = this.ambPoints.geometry.getAttribute('position');
    const pos = attr.array;
    const t = (this._ambT = (this._ambT ?? 0) + dt);
    const N = this._ambPhase.length;
    for (let i = 0; i < N; i++) {
      const ph = this._ambPhase[i];
      pos[i * 3] += Math.sin(t * 0.7 + ph) * def.sway * dt;
      pos[i * 3 + 1] += def.rise * dt + Math.sin(t * 1.3 + ph * 2) * 0.12 * dt;
      pos[i * 3 + 2] += Math.cos(t * 0.6 + ph) * def.sway * dt;
      // Recicla verticalmente e mantém a nuvem centrada no grupo.
      if (pos[i * 3 + 1] < 0.2) pos[i * 3 + 1] = 6.5;
      else if (pos[i * 3 + 1] > 7) pos[i * 3 + 1] = 0.3;
      const dx = pos[i * 3] - c.x, dz = pos[i * 3 + 2] - c.z;
      if (dx * dx + dz * dz > 34 * 34) {
        pos[i * 3] = c.x + (this.rng() - 0.5) * 56;
        pos[i * 3 + 2] = c.z + (this.rng() - 0.5) * 56;
      }
    }
    attr.needsUpdate = true;
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

  _spawnDetail(x, z, biome) {
    if (!this._freeDetail.length) return;
    const def = BIOMES[biome];
    const slot = this._freeDetail.pop();
    const s = 0.6 + this.rng() * 0.8;
    // Jitter sutil de tom para o tapete não parecer carimbado.
    const c = new THREE.Color(def.detailColor ?? def.propColor);
    c.multiplyScalar(0.85 + this.rng() * 0.3);
    this._setInstance(this.detailInst, slot, x, 0.27 * s, z, this.rng() * Math.PI * 2, s, c.getHex());
    this.details.push({ x, z, slot });
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
    if (game.inDungeon) return; // mundo aberto suspenso dentro da masmorra
    const c = game.groupCenter ?? { x: 0, z: 0 };
    this._revealAround(c.x, c.z);

    // Bioma atual -> clima/cor/partículas.
    const b = biomeAt(c.x, c.z);
    if (b !== this.currentBiome) {
      this.currentBiome = b;
      this.groundMat.color.setHex(BIOMES[b].ground);
      game.renderer.setBiomeMood(BIOMES[b]);
      if (this.ambPoints) {
        const amb = BIOMES[b].ambient;
        this.ambPoints.material.color.setHex(amb.color);
        this.ambPoints.material.size = amb.size;
        this.ambPoints.material.opacity = amb.opacity;
      }
      game.emit('biomeChanged', { biome: b, def: BIOMES[b] });
    }

    // Descartar props/detalhes distantes (libera o slot instanciado).
    let despawned = false;
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      if (Math.hypot(p.x - c.x, p.z - c.z) > this.despawnRadius) {
        this._despawnProp(p);
        this.props.splice(i, 1);
        despawned = true;
      }
    }
    for (let i = this.details.length - 1; i >= 0; i--) {
      const d = this.details[i];
      if (Math.hypot(d.x - c.x, d.z - c.z) > this.despawnRadius) {
        this._hideInstance(this.detailInst, d.slot);
        this._freeDetail.push(d.slot);
        this.details.splice(i, 1);
        despawned = true;
      }
    }
    if (despawned) this._flushInstances();

    // Gerar props novos no anel ao redor do grupo (longe do hub e das vilas —
    // os assentamentos cuidam da própria decoração).
    let guard = 0;
    let spawned = false;
    while (this.props.length < this.maxProps && guard++ < 8) {
      const a = this.rng() * Math.PI * 2;
      const rad = 14 + this.rng() * (this.spawnRadius - 14);
      const x = c.x + Math.sin(a) * rad;
      const z = c.z + Math.cos(a) * rad;
      if (Math.hypot(x, z) < 8) continue; // mantém o hub limpo
      if (game.settlements?.isSafe(x, z, 2)) continue;
      this._spawnProp(x, z, biomeAt(x, z));
    }
    guard = 0;
    while (this.details.length < this.maxDetails && guard++ < 16) {
      const a = this.rng() * Math.PI * 2;
      const rad = 8 + this.rng() * (this.spawnRadius - 8);
      const x = c.x + Math.sin(a) * rad;
      const z = c.z + Math.cos(a) * rad;
      if (game.settlements?.isSafe(x, z, -2)) continue; // grama pode roçar a borda da vila
      this._spawnDetail(x, z, biomeAt(x, z));
      spawned = true;
    }
    if (spawned) this._flushInstances();

    this._updateAmbience(dt, c);
    this._updateShards(c);
  }

  _updateShards(c) {
    const { game } = this;
    this._loreActive = this._loreActive ?? new Set();
    // Remove colhidos (entidade não existe mais) e os muito distantes.
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      if (!game.world.entities.has(s.id)) {
        if (s.loreId) this._loreActive.delete(s.loreId);
        this.shards.splice(i, 1);
        continue;
      }
      if (Math.hypot(s.x - c.x, s.z - c.z) > this.despawnRadius + 12) {
        const r = game.world.get(s.id, C.Renderable);
        if (r) game.renderer.remove(r.object3d);
        game.world.destroyEntity(s.id);
        if (s.loreId) this._loreActive.delete(s.loreId);
        this.shards.splice(i, 1);
      }
    }

    const ringPoint = () => {
      const a = this.rng() * Math.PI * 2;
      const rad = 16 + this.rng() * (this.spawnRadius - 16);
      return { x: c.x + Math.sin(a) * rad, z: c.z + Math.cos(a) * rad };
    };

    // Página de lore (rara): só entradas ainda não descobertas/ativas.
    if (this.rng.chance(0.012)) {
      const entry = LORE.find((l) => !game.lore.found.has(l.id) && !this._loreActive.has(l.id));
      if (entry) {
        const p = ringPoint();
        if (Math.hypot(p.x, p.z) >= 12) {
          const id = createLootOrb(game.world, game.renderer, { x: p.x, z: p.z, item: { lore: entry, rarityColor: 0xffd56a } });
          this._loreActive.add(entry.id);
          this.shards.push({ id, x: p.x, z: p.z, loreId: entry.id });
        }
      }
    }

    // Fragmento de essência (colhível comum).
    if (this.shards.length < this.maxShards && this.rng.chance(0.04)) {
      const p = ringPoint();
      if (Math.hypot(p.x, p.z) < 12) return;
      const id = createLootOrb(game.world, game.renderer, { x: p.x, z: p.z, item: { essence: 4 + Math.floor(this.rng() * 4), rarityColor: 0x9fe06a } });
      this.shards.push({ id, x: p.x, z: p.z });
    }
  }
}
