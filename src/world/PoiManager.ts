import * as THREE from 'three';
import { pixelTexture } from '../core/render/pixelTextures.js';
import { C } from '../core/ecs/components.js';
import { dist, makeRng, weightedPick } from '../utils/math.js';
import { biomeAt } from './WorldManager.js';
import { BIOMES } from '../data/biomes.js';
import { createLootOrb } from '../entities/factories.js';
import { generateItem } from '../gameplay/loot.js';

/**
 * Pontos de interesse: acampamentos corrompidos espalhados pelo mundo. Ao se
 * aproximar, o acampamento ativa e spawna guardas; ao limpá-lo, dá recompensa
 * (loot + essência) e fica purificado (persistido no save). Ver ADR 0017.
 */
const ACTIVATE_RANGE = 30;

export class PoiManager {
  game: any;
  camps: any[];
  cleared: Set<string>;

  constructor(game) {
    this.game = game;
    this.cleared = new Set(); // ids purificados (persistido)
    this.camps = this._generateCamps(game.seed ?? 1337);
    this._buildRuins();
    game.on('kill', (e) => this._onKill(e));
  }

  /**
   * Ruínas de pedra nos acampamentos (ADR 0067): círculo quebrado de blocos
   * — o POI lê à distância como "lugar antigo", no vocabulário MCD. Ficam
   * mesmo depois de purificar (a história aconteceu ali). 1 InstancedMesh.
   */
  _buildRuins() {
    const rng = makeRng(((this.game.seed ?? 1337) ^ 0x51ab3e) >>> 0);
    const dummy = new THREE.Object3D();
    const mats: THREE.Matrix4[] = [];
    for (const camp of this.camps) {
      const n = 5 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        if (rng() < 0.3) continue; // círculo quebrado
        const a = (i / n) * Math.PI * 2 + rng() * 0.3;
        const h = rng() < 0.3 ? 2 : 1;
        for (let y = 0; y < h; y++) {
          dummy.position.set(camp.x + Math.sin(a) * 4.2, 0.45 + y * 0.85, camp.z + Math.cos(a) * 4.2);
          dummy.rotation.y = Math.floor(rng() * 4) * (Math.PI / 2); // grid voxel (ADR 0076)
          dummy.scale.setScalar(0.85 + rng() * 0.3);
          dummy.updateMatrix();
          mats.push(dummy.matrix.clone());
        }
      }
    }
    if (!mats.length) return;
    const inst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x8a857e, roughness: 1, map: pixelTexture('stone') }),
      mats.length,
    );
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    for (let i = 0; i < mats.length; i++) inst.setMatrixAt(i, mats[i]);
    this.game.renderer?.add(inst);
  }

  _generateCamps(seed) {
    const rng = makeRng((seed ^ 0x9e3779b9) >>> 0);
    const camps = [];
    const rings = [
      { rmin: 24, rmax: 50, count: 1 }, // clareira (intro)
      { rmin: 62, rmax: 104, count: 2 }, // pântano
      { rmin: 116, rmax: 158, count: 2 }, // bosque cinza
      { rmin: 172, rmax: 212, count: 2 }, // picos
    ];
    let n = 0;
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        // Evita o eixo -Z (onde ficam os santuários) e os assentamentos.
        let x = 0, z = 0;
        for (let tries = 0; tries < 8; tries++) {
          const ang = rng.range(0.4, Math.PI * 2 - 0.4);
          const rad = rng.range(ring.rmin, ring.rmax);
          x = Math.sin(ang) * rad;
          z = Math.cos(ang) * rad;
          if (!this.game.settlements?.isSafe(x, z, 12)) break;
        }
        camps.push({ id: `camp${n++}`, x, z, biome: biomeAt(x, z), active: false, cleared: false, remaining: 0, mesh: null });
      }
    }
    return camps;
  }

  _activate(camp) {
    const { game } = this;
    const def = BIOMES[camp.biome];
    const ringIdx = ['clareira', 'pantano', 'bosque_cinza', 'picos', 'coracao'].indexOf(camp.biome);
    const count = 3 + Math.max(0, ringIdx);
    camp.active = true;
    camp.remaining = count;

    // Totem corrompido (visual; some ao purificar).
    const totem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a2440, emissive: 0x6a2a7a, emissiveIntensity: 0.5 }),
    );
    totem.position.set(camp.x, 1.5, camp.z);
    totem.castShadow = true;
    game.renderer.add(totem);
    camp.mesh = totem;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const ex = camp.x + Math.sin(a) * 3;
      const ez = camp.z + Math.cos(a) * 3;
      const key = weightedPick(def.enemies, Math.random).key;
      const id = game.spawnEnemyByKey(key, ex, ez);
      if (id) game.world.add(id, C.CampMember, { campId: camp.id });
    }
    game.emit('objective', { text: 'A Corrupção acampou aqui. Devolva este chão à floresta!' });
    game.emit('vfxRing', { x: camp.x, z: camp.z, radius: 5, color: 0x8a3aa0 });
  }

  _onKill(e) {
    const member = this.game.world.get(e.id, C.CampMember);
    if (!member) return;
    const camp = this.camps.find((c) => c.id === member.campId && c.active && !c.cleared);
    if (!camp) return;
    camp.remaining--;
    if (camp.remaining <= 0) this._clear(camp);
  }

  _clear(camp) {
    const { game } = this;
    camp.cleared = true;
    camp.active = false;
    this.cleared.add(camp.id);
    if (camp.mesh) { game.renderer.remove(camp.mesh); camp.mesh = null; }
    // Recompensa: loot + essência.
    const lvl = game.regionLevel();
    for (let i = 0; i < 2; i++) {
      createLootOrb(game.world, game.renderer, { x: camp.x + (Math.random() - 0.5) * 2, z: camp.z + (Math.random() - 0.5) * 2, item: generateItem(lvl) });
    }
    createLootOrb(game.world, game.renderer, { x: camp.x, z: camp.z, item: { essence: 8 + lvl * 2, rarityColor: 0x9fe06a } });
    game.emit('objective', { text: '🌱 A terra respira de novo. Acampamento purificado!' });
    game.emit('campPurified', { id: camp.id });
    game.emit('vfxRing', { x: camp.x, z: camp.z, radius: 6, color: 0x9fe06a });
    game.camera?.addShake(0.4);
  }

  update() {
    if (this.game.inDungeon) return;
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    for (const camp of this.camps) {
      if (camp.cleared || camp.active || this.cleared.has(camp.id)) continue;
      if (dist(c.x, c.z, camp.x, camp.z) < ACTIVATE_RANGE) this._activate(camp);
    }
  }
}
