import * as THREE from 'three';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { BIOMES } from '../data/biomes.js';
import { makeRng } from '../utils/math.js';

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
  constructor(game) {
    this.game = game;
    this.rng = makeRng(game.seed ?? 1337);
    this.currentBiome = 'clareira';
    this.props = []; // { id, x, z }
    this.spawnRadius = 34;
    this.despawnRadius = 48;
    this.maxProps = 90;

    // Chão grande recolorido conforme o bioma.
    this.groundMat = new THREE.MeshStandardMaterial({ color: BIOMES.clareira.ground, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    game.renderer.add(ground);

    this._buildHub();
    game.renderer.setBiomeMood(BIOMES.clareira);
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
    const id = game.world.createEntity();
    const group = new THREE.Group();
    if (this.rng.chance(0.7)) {
      // Árvore
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0x4a3424 }));
      trunk.position.y = 1.1; trunk.castShadow = true;
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: def.propColor }));
      leaves.position.y = 2.6; leaves.castShadow = true;
      group.add(trunk); group.add(leaves);
      game.world.add(id, C.Collider, Collider(0.5, true));
    } else {
      // Rocha
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), new THREE.MeshStandardMaterial({ color: 0x6b6b6b }));
      rock.position.y = 0.5; rock.castShadow = true;
      group.add(rock);
      game.world.add(id, C.Collider, Collider(0.8, true));
    }
    group.position.set(x, 0, z);
    game.renderer.add(group);
    game.world.add(id, C.Transform, Transform(x, z));
    game.world.add(id, C.Renderable, { object3d: group, baseScale: 1, isProp: true });
    this.props.push({ id, x, z });
  }

  update(dt) {
    const { game } = this;
    const c = game.groupCenter ?? { x: 0, z: 0 };

    // Bioma atual -> clima/cor.
    const b = biomeAt(c.x, c.z);
    if (b !== this.currentBiome) {
      this.currentBiome = b;
      this.groundMat.color.setHex(BIOMES[b].ground);
      game.renderer.setBiomeMood(BIOMES[b]);
      game.emit('biomeChanged', { biome: b, def: BIOMES[b] });
    }

    // Descartar props distantes.
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      if (Math.hypot(p.x - c.x, p.z - c.z) > this.despawnRadius) {
        const r = game.world.get(p.id, C.Renderable);
        if (r) game.renderer.remove(r.object3d);
        game.world.destroyEntity(p.id);
        this.props.splice(i, 1);
      }
    }

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
  }
}
