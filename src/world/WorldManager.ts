import * as THREE from 'three';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { BIOMES } from '../data/biomes.js';
import { makeRng, valueNoise2 } from '../utils/math.js';
import { SETTLEMENTS } from '../data/settlements.js';
import { createLootOrb } from '../entities/factories.js';
import { pixelTexture, tiledPixelTexture } from '../core/render/pixelTextures.js';
import { LORE } from '../data/lore.js';
import { canopyGeo, pineGeo, rockGeo, mergeBoxes } from './voxelGeo.js';

/**
 * Mundo aberto **orgânico** (ADR 0109): em vez de anéis concêntricos, cada
 * bioma é uma região de Voronoi ao redor de uma âncora (o centro da sua vila),
 * com as fronteiras deformadas por value-noise (domain warp) para dar bordas
 * irregulares e naturais — sem ordem radial imposta. O Coração Corrompido é uma
 * mancha própria ao sul. Props são gerados em anel ao redor do grupo e
 * descartados ao se distanciar — pseudo-streaming. Ver docs/adr/0008 e 0109.
 */

// Peso de cada bioma no Voronoi ponderado (ADR 0110): peso maior = região maior.
// A Clareira (bioma inicial) domina o centro, virando uma zona de exploração
// ampla antes de avançar; as vilas 2–4 ficam bem no interior dos seus biomas.
const BIOME_WEIGHT = { clareira: 1.3, pantano: 1, bosque_cinza: 1, picos: 1, coracao: 1 };

// Âncora de cada bioma = centro da vila daquele bioma (data-driven), com peso.
export const BIOME_ANCHORS = SETTLEMENTS.map((s) => ({
  biome: s.biome, x: s.x, z: s.z, weight: BIOME_WEIGHT[s.biome] ?? 1,
}));

// Mancha do Coração Corrompido (bioma final), fora do alcance das vilas.
// Ampliada e empurrada ao sul junto com os biomas maiores (ADR 0119).
export const CORACAO_BLOB = { x: 0, z: -285, r: 110 };

// Deformação das fronteiras: amplitude (u) e frequência do domain warp. Amplitude
// contida para não desestabilizar os centros das vilas no Voronoi ponderado.
const WARP_AMP = 18;
const WARP_FREQ = 0.012;

/**
 * Bioma em (x,z): warpa a posição por ruído e devolve o bioma da âncora mais
 * próxima por **distância ponderada** (dist/peso) — ou `coracao` se cair na
 * mancha do Coração. Determinístico e puro.
 */
export function biomeAt(x, z) {
  const wx = x + valueNoise2(x * WARP_FREQ + 11.3, z * WARP_FREQ - 4.1) * WARP_AMP;
  const wz = z + valueNoise2(x * WARP_FREQ - 7.7, z * WARP_FREQ + 19.5) * WARP_AMP;
  if (Math.hypot(wx - CORACAO_BLOB.x, wz - CORACAO_BLOB.z) < CORACAO_BLOB.r) return 'coracao';
  let best = BIOME_ANCHORS[0].biome, bd = Infinity;
  for (const a of BIOME_ANCHORS) {
    const dx = wx - a.x, dz = wz - a.z;
    const d = Math.sqrt(dx * dx + dz * dz) / a.weight;
    if (d < bd) { bd = d; best = a.biome; }
  }
  return best;
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
  trunkInst: any; leafInst: any; rockInst: any; detailInst: any; pineInst: any;
  _freeTree: number[]; _freeRock: number[]; _freeDetail: number[]; _freePine: number[];
  _windMats: any[]; _windT: number;
  details: any[]; maxDetails: number;
  ambPoints: any; _ambPhase: Float32Array; _ambT: number; _ambApplied: any;
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
    // Chão de "blocos": textura pixel-art 1 unidade = 1 bloco de 16px (ADR
    // 0062) — a moldura sutil da textura desenha a grade estilo MCD.
    const groundTex = tiledPixelTexture('grass', 600, 600);
    this.groundMat = new THREE.MeshStandardMaterial({ color: BIOMES.clareira.ground, roughness: 1, map: groundTex });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    // Abaixo da grade de blocos (ADR 0063/0064): o plano é só o horizonte
    // distante sob a névoa — a superfície de verdade são os blocos.
    ground.position.y = -0.35;
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
    const mk = (geo, tex?) => {
      const inst = new THREE.InstancedMesh(
        geo,
        new THREE.MeshStandardMaterial({ roughness: 0.9, map: tex ? pixelTexture(tex) : null }),
        cap,
      );
      inst.castShadow = true;
      inst.receiveShadow = true;
      inst.frustumCulled = false; // instâncias espalhadas; evita sumiço por culling
      this.game.renderer.add(inst);
      return inst;
    };
    // Vocabulário voxel (ADR 0074): troncos, copas, pinheiros e rochas são
    // clusters de caixas fundidos — mesma silhueta cúbica do chão de blocos.
    this.trunkInst = mk(new THREE.BoxGeometry(0.55, 2.2, 0.55), 'log');
    this.leafInst = mk(canopyGeo(), 'leaves');
    this.rockInst = mk(rockGeo(), 'stone');
    // Pinheiros (Picos Gélidos): silhueta própria por bioma (ADR 0055).
    this.pineInst = mk(pineGeo(), 'leaves');
    this._freeTree = [];
    this._freeRock = [];
    this._freePine = [];
    for (let i = 0; i < cap; i++) {
      this._freeTree.push(i);
      this._freeRock.push(i);
      this._freePine.push(i);
      this._hideInstance(this.trunkInst, i);
      this._hideInstance(this.leafInst, i);
      this._hideInstance(this.rockInst, i);
      this._hideInstance(this.pineInst, i);
    }
    // Vento: copas, pinheiros e grama balançam via shader (ADR 0055).
    this._windMats = [];
    this._windT = 0;
    this._addWind(this.leafInst.material, 0.08);
    this._addWind(this.pineInst.material, 0.05);
    // Vegetação rasteira (tufos de grama/brotos): pool próprio, mais denso,
    // sem colisor nem entidade — puro detalhe visual do bioma.
    const detailCap = this.maxDetails + 16;
    this.detailInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.18, 0.55, 0.18),
      new THREE.MeshStandardMaterial({ roughness: 1 }),
      detailCap,
    );
    this.detailInst.receiveShadow = true;
    this.detailInst.frustumCulled = false;
    this._addWind(this.detailInst.material, 0.3);
    this.game.renderer.add(this.detailInst);
    this._freeDetail = [];
    for (let i = 0; i < detailCap; i++) {
      this._freeDetail.push(i);
      this._hideInstance(this.detailInst, i);
    }
    this._flushInstances();
  }

  /**
   * Vento nos instanciados (ADR 0055): desloca o topo dos vértices por seno,
   * com fase pela posição da instância (cada planta no seu ritmo). Uniform
   * compartilhado avançado no update; onBeforeCompile só roda com WebGL real,
   * então testes headless ficam intactos.
   */
  _addWind(mat, strength) {
    const uWind = { value: 0 };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWind = uWind;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float windH = max(0.0, position.y + 0.5);
          float windPh = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
          transformed.x += sin(uWind * 1.6 + windPh) * ${strength.toFixed(3)} * windH;
          transformed.z += cos(uWind * 1.2 + windPh) * ${(strength * 0.6).toFixed(3)} * windH;`);
    };
    mat.customProgramCacheKey = () => 'wind' + strength;
    this._windMats.push(uWind);
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
    for (const inst of [this.trunkInst, this.leafInst, this.rockInst, this.detailInst, this.pineInst]) {
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
    // Clima ativo sobrepõe as partículas do bioma (chuva/nevasca/cinzas —
    // ADR 0049); à noite os vagalumes/fagulhas (partículas que sobem) brilham.
    const weather = this.game.dayNight?.weatherAmbient?.() ?? null;
    const def = weather ?? this._effectiveDef(this.currentBiome)?.ambient;
    if (!def || !this.ambPoints) return;
    if (this._ambApplied !== def) {
      this._ambApplied = def;
      this.ambPoints.material.color.setHex(def.color);
      this.ambPoints.material.size = def.size;
    }
    const night = this.game.dayNight?.nightAmount?.() ?? 0;
    this.ambPoints.material.opacity = def.opacity * (def.rise > 0 ? 1 + night * 0.5 : 1);
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
    // Voxel (ADR 0074): coluna quadrada + copa em cluster de blocos grandes.
    const t = new THREE.Mesh(
      mergeBoxes([
        { w: 3.4, h: 1.2, d: 3.4, x: 0, y: 0.6, z: 0 },
        { w: 2.7, h: 5.2, d: 2.7, x: 0, y: 3.2, z: 0 },
      ]),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f, map: tiledPixelTexture('log', 3, 4) }),
    );
    t.castShadow = true;
    const crown = new THREE.Mesh(
      mergeBoxes([
        { w: 7.5, h: 4.2, d: 7.5, x: 0, y: 0, z: 0 },
        { w: 4.2, h: 2.6, d: 4.2, x: 3.2, y: 1.4, z: 1.0 },
        { w: 3.6, h: 2.4, d: 3.6, x: -3.0, y: 0.9, z: -1.6 },
        { w: 3.0, h: 2.2, d: 3.0, x: 0.6, y: 2.9, z: -2.2 },
        { w: 2.6, h: 2.0, d: 2.6, x: -1.2, y: 3.1, z: 2.4 },
      ]),
      new THREE.MeshStandardMaterial({ color: 0x4f8f3f, map: tiledPixelTexture('leaves', 3, 3) }),
    );
    crown.position.y = 8; crown.castShadow = true;
    trunk.add(t); trunk.add(crown);
    // Carvalho-Mãe no CENTRO da vila (0,0): a Clareira cresce em anel ao redor
    // dela (ADR 0111), como diz o lore. Antes ficava deslocada em −Z.
    trunk.position.set(0, 0, 0);
    game.renderer.add(trunk);
    // Obstáculo do tronco.
    const id = game.world.createEntity();
    game.world.add(id, C.Transform, Transform(0, 0));
    game.world.add(id, C.Collider, Collider(2.2, true));
  }

  _spawnProp(x, z, biome) {
    const { game } = this;
    const def = this._effectiveDef(biome);
    // Alinhado ao voxel (ADR 0074): só rotações de 90° — nada "torto" no mundo.
    const rot = Math.floor(this.rng() * 4) * (Math.PI / 2);
    let rec;
    const wantTree = this.rng.chance(0.7); // decisão única árvore/rocha
    if (wantTree && biome === 'picos' && this._freePine.length && this._freeTree.length) {
      // Picos: pinheiros (cone) no lugar da copa redonda.
      const slot = this._freePine.pop();
      const trunkSlot = this._freeTree.pop();
      // Escala MCD (ADR 0075): cenário grande em relação ao herói.
      const s = 1.0 + this.rng() * 0.7;
      this._setInstance(this.trunkInst, trunkSlot, x, 0.6 * s, z, rot, s * 0.7, 0x4a3a30);
      this._setInstance(this.pineInst, slot, x, 0.9 * s, z, rot, s, def.propColor);
      const id = game.world.createEntity();
      game.world.add(id, C.Transform, Transform(x, z));
      game.world.add(id, C.Collider, Collider(0.5, true));
      rec = { id, x, z, type: 'pine', slot, trunkSlot };
    } else if (wantTree && this._freeTree.length) {
      const slot = this._freeTree.pop();
      const s = 1.0 + this.rng() * 0.6; // escala MCD (ADR 0075)
      this._setInstance(this.trunkInst, slot, x, 1.1 * s, z, rot, s, 0x4a3424);
      this._setInstance(this.leafInst, slot, x, 2.6 * s, z, rot, s, def.propColor);
      const id = game.world.createEntity();
      game.world.add(id, C.Transform, Transform(x, z));
      game.world.add(id, C.Collider, Collider(0.5, true));
      rec = { id, x, z, type: 'tree', slot };
    } else if (this._freeRock.length) {
      const slot = this._freeRock.pop();
      const s = 0.7 + this.rng() * 0.6;
      this._setInstance(this.rockInst, slot, x, 0, z, rot, s, 0x6b6b6b);
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
    const def = this._effectiveDef(biome);
    const slot = this._freeDetail.pop();
    const s = 0.6 + this.rng() * 0.8;
    // Jitter sutil de tom para o tapete não parecer carimbado.
    const c = new THREE.Color(def.detailColor ?? def.propColor);
    c.multiplyScalar(0.85 + this.rng() * 0.3);
    this._setInstance(this.detailInst, slot, x, 0.27 * s, z, Math.floor(this.rng() * 4) * (Math.PI / 2), s, c.getHex());
    this.details.push({ x, z, slot });
  }

  _despawnProp(rec) {
    if (rec.type === 'pine') {
      this._hideInstance(this.pineInst, rec.slot);
      this._freePine.push(rec.slot);
      this._hideInstance(this.trunkInst, rec.trunkSlot);
      this._freeTree.push(rec.trunkSlot);
    } else if (rec.type === 'tree') {
      this._hideInstance(this.trunkInst, rec.slot);
      this._hideInstance(this.leafInst, rec.slot);
      this._freeTree.push(rec.slot);
    } else {
      this._hideInstance(this.rockInst, rec.slot);
      this._freeRock.push(rec.slot);
    }
    this.game.world.destroyEntity(rec.id);
  }

  /** Definição do bioma com o overlay de purificação, se houver (ADR 0044). */
  _effectiveDef(biome) {
    return this.game.purity?.effectiveDef(biome) ?? BIOMES[biome];
  }

  /** Aplica cor do chão e partículas de uma definição de bioma (base/curada). */
  applyBiomeDef(def) {
    this.groundMat.color.setHex(def.ground);
    // Material do bloco por bioma (grama/terra/neve/pedra — ADR 0062).
    const tex = tiledPixelTexture(def.groundTex ?? 'grass', 600, 600);
    if (tex && this.groundMat.map !== tex) this.groundMat.map = tex;
    if (this.ambPoints) {
      this.ambPoints.material.color.setHex(def.ambient.color);
      this.ambPoints.material.size = def.ambient.size;
      this.ambPoints.material.opacity = def.ambient.opacity;
    }
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

    // Bioma atual -> clima/cor/partículas (com overlay de purificação).
    const b = biomeAt(c.x, c.z);
    if (b !== this.currentBiome) {
      this.currentBiome = b;
      const def = this._effectiveDef(b);
      this.applyBiomeDef(def);
      game.renderer.setBiomeMood(def);
      game.emit('biomeChanged', { biome: b, def });
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

    this._windT += dt;
    for (const u of this._windMats) u.value = this._windT;
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
