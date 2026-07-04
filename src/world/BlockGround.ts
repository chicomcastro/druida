import * as THREE from 'three';
import { BIOMES } from '../data/biomes.js';
import { biomeAt } from './WorldManager.js';
import { pixelTexture } from '../core/render/pixelTextures.js';
import { makeRng } from '../utils/math.js';

/**
 * Chão de blocos (ADR 0063, M14.2): grade de topos de bloco 1×1 ao redor do
 * grupo, no estilo Minecraft Dungeons. Um InstancedMesh por tipo de textura
 * (grama/terra/neve/pedra) = 4 draw calls para o chão inteiro. Cada bloco
 * ganha jitter de cor (quebra o liso) e ~6% deles afundam de leve (relevo
 * sem enterrar os pés — o plano de gameplay continua y=0). A grade segue o
 * grupo por células (pseudo-streaming, como os props) e o plano gigante
 * antigo vira horizonte por baixo (coberto pela névoa).
 */
const RADIUS = 34; // blocos para cada lado do centro (69×69 células)
const KINDS = ['grass', 'dirt', 'snow', 'stone', 'lava'] as const;

export class BlockGround {
  game: any;
  _pools: Record<string, THREE.InstancedMesh>;
  _dummy: THREE.Object3D;
  _color: THREE.Color;
  _lastCx: number; _lastCz: number;

  constructor(game) {
    this.game = game;
    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();
    this._lastCx = Infinity; this._lastCz = Infinity;
    const cap = (RADIUS * 2 + 1) * (RADIUS * 2 + 1);
    this._pools = {};
    for (const kind of KINDS) {
      const geo = new THREE.BoxGeometry(1, 0.3, 1);
      // Lava (ADR 0064): emissiva forte — o bloom faz o resto. Sem map: a
      // cor do brilho é o próprio material.
      const mat = kind === 'lava'
        ? new THREE.MeshStandardMaterial({ color: 0x2a1006, emissive: 0xff5a1a, emissiveIntensity: 1.15, roughness: 1 })
        : new THREE.MeshStandardMaterial({ roughness: 1, map: pixelTexture(kind) });
      const inst = new THREE.InstancedMesh(geo, mat, cap);
      inst.receiveShadow = true;
      inst.castShadow = false;
      inst.frustumCulled = false;
      inst.count = 0;
      game.renderer?.add(inst);
      this._pools[kind] = inst;
    }
  }

  /** Reconstrói a grade quando o grupo muda de célula (barato: ~4.7k blocos). */
  update() {
    // Masmorras têm chão próprio (arena em 0,1000): esconde a grade lá.
    if (this.game.inDungeon) {
      if (this._lastCx !== Infinity) {
        this._lastCx = Infinity; this._lastCz = Infinity;
        for (const kind of KINDS) { this._pools[kind].count = 0; }
      }
      return;
    }
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    const cx = Math.round(c.x), cz = Math.round(c.z);
    if (Math.abs(cx - this._lastCx) < 2 && Math.abs(cz - this._lastCz) < 2) return;
    this._lastCx = cx; this._lastCz = cz;

    const counts: Record<string, number> = { grass: 0, dirt: 0, snow: 0, stone: 0, lava: 0 };
    for (let gx = cx - RADIUS; gx <= cx + RADIUS; gx++) {
      for (let gz = cz - RADIUS; gz <= cz + RADIUS; gz++) {
        const biome = biomeAt(gx, gz);
        const def = this.game.worldManager?._effectiveDef?.(biome) ?? BIOMES[biome];
        let kind = def.groundTex ?? 'grass';
        // RNG determinístico por célula: o mundo não "ferve" ao recompor.
        const r = makeRng(((gx * 73856093) ^ (gz * 19349663)) >>> 0);
        const sunken = r() < 0.06;
        // Coração (não purificado): veios de lava afundados entre a pedra.
        const lava = kind === 'stone' && biome === 'coracao' && r() < 0.05;
        if (lava) kind = 'lava';
        const inst = this._pools[kind];
        if (!inst) continue;
        this._dummy.position.set(gx, lava || sunken ? -0.26 : -0.16, gz); // topo ~0 / afundado
        this._dummy.rotation.y = (Math.floor(r() * 4) * Math.PI) / 2; // gira a textura
        this._dummy.scale.set(1, 1, 1);
        this._dummy.updateMatrix();
        const i = counts[kind]++;
        inst.setMatrixAt(i, this._dummy.matrix);
        // Jitter de valor por bloco (±7%) sobre a cor do bioma; afundado escurece.
        const v = 0.93 + r() * 0.14;
        if (lava) this._color.setHex(0xffffff);
        else this._color.setHex(def.ground).multiplyScalar(sunken ? v * 0.78 : v);
        inst.setColorAt(i, this._color);
      }
    }
    for (const kind of KINDS) {
      const inst = this._pools[kind];
      inst.count = counts[kind];
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
  }
}
