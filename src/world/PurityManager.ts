import * as THREE from 'three';
import { BIOMES, BIOME_ORDER } from '../data/biomes.js';

/**
 * Purificação visível do mundo: conforme a campanha avança, as regiões curam
 * — chão/luz/névoa clareiam (overlay `purified` do bioma) e as partículas
 * viram vagalumes ("quando a noite cai limpa, os vagalumes voltam", lore l8).
 * Acampamentos purificados florescem no lugar do totem.
 *
 * O conjunto de regiões puras é DERIVADO de `story.step` (já persistido no
 * save) e o florescer é derivado de `poi.camps[].cleared` — nada novo para
 * salvar, e o estado se reconstrói sozinho ao carregar.
 * Ver docs/adr/0044-purificacao-visivel.md.
 */

// Bioma purificado a partir de qual passo da história (índice em STEPS).
// talk(0) purify_clearing(1) find_bear(2) slay_miniboss(3) find_raven(4)
// find_frog(5) confront(6) victory(7)
const PURIFY_AT_STEP: Record<string, number> = {
  clareira: 2, // Clareira limpa ao completar "purifique a Clareira"
  pantano: 4, // Pântano cura com a Árvore-Carniça derrotada
  bosque_cinza: 5, // Bosque respira com o Santuário do Corvo desperto
  picos: 6, // Picos se abrem com o Santuário do Sapo desperto
  coracao: 7, // O Coração renasce na vitória
};

const REGION_LINES: Record<string, string> = {
  clareira: '🌱 A Clareira respira de novo — os vagalumes voltaram.',
  pantano: '🌱 O Pântano clareia — a água volta a correr limpa.',
  bosque_cinza: '🌱 O Bosque Cinza brota em verde outra vez.',
  picos: '🌱 Os Picos brilham — o gelo voltou a ser só gelo.',
  coracao: '🌱 O Coração renasce. A floresta inteira floresce.',
};

const FLOWER_COLORS = [0xffd56a, 0xff9ad0, 0x9fe0ff, 0xe8a0ff];

export class PurityManager {
  game: any;
  purified: Set<string>;
  _bloomed: Set<string>;

  constructor(game) {
    this.game = game;
    this.purified = new Set();
    this._bloomed = new Set();
  }

  isPurified(biome: string) {
    return this.purified.has(biome);
  }

  /** Definição efetiva do bioma: base + overlay `purified` quando curado. */
  effectiveDef(biome: string) {
    const base = BIOMES[biome];
    if (!base) return base;
    if (!this.purified.has(biome) || !base.purified) return base;
    const p = base.purified;
    return {
      ...base,
      ...p,
      light: { ...base.light, ...(p.light ?? {}) },
      ambient: { ...base.ambient, ...(p.ambient ?? {}) },
    };
  }

  /**
   * Deriva o estado do passo da história e dos acampamentos; anuncia e
   * re-aplica o clima quando uma região acabou de curar.
   */
  update() {
    const { game } = this;
    const step = game.story?.step ?? 0;
    for (const biome of BIOME_ORDER) {
      if (this.purified.has(biome) || step < PURIFY_AT_STEP[biome]) continue;
      this.purified.add(biome);
      // Só celebra em transições ao vivo (não na reconstrução via save, que
      // acontece no primeiro update — aí o clima apenas já nasce curado).
      if (this._live) {
        game.emit('regionPurified', { biome });
        game.emit('objective', { text: REGION_LINES[biome] });
        const c = game.groupCenter ?? { x: 0, z: 0 };
        game.emit('vfxRing', { x: c.x, z: c.z, radius: 8, color: 0x9fe06a });
      }
      // Se o grupo está na região, o mundo clareia na hora.
      if (game.worldManager?.currentBiome === biome) this._refreshMood(biome);
    }
    this._live = true;

    // Acampamentos purificados florescem (uma vez cada; cobre load e runtime).
    for (const camp of game.poi?.camps ?? []) {
      if (!camp.cleared || this._bloomed.has(camp.id)) continue;
      this._bloomed.add(camp.id);
      this.bloomAt(camp.x, camp.z);
    }
  }
  _live = false;

  _refreshMood(biome: string) {
    const def = this.effectiveDef(biome);
    this.game.renderer.setBiomeMood(def);
    this.game.worldManager?.applyBiomeDef?.(def);
  }

  /** Canteiro de flores e brotos onde a corrupção foi limpa. */
  bloomAt(x: number, z: number) {
    const g = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + (i % 3) * 0.4;
      const r = 0.8 + (i % 4) * 0.7;
      const px = Math.sin(a) * r, pz = Math.cos(a) * r;
      if (i % 3 === 0) {
        // Flor: caule + corola colorida.
        const stem = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.5, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x4f8f3f, roughness: 1 }),
        );
        stem.position.set(px, 0.25, pz);
        const color = FLOWER_COLORS[i % FLOWER_COLORS.length];
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.24, 0.24),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.6 }),
        );
        head.position.set(px, 0.55, pz);
        g.add(stem, head);
      } else {
        // Broto de grama viva.
        const sprout = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.45, 0.18),
          new THREE.MeshStandardMaterial({ color: i % 2 ? 0x7ac86a : 0x9fe06a, roughness: 1 }),
        );
        sprout.position.set(px, 0.22, pz);
        g.add(sprout);
      }
    }
    g.position.set(x, 0, z);
    this.game.renderer.add(g);
    this.game.emit('vfxRing', { x, z, radius: 4, color: 0x9fe06a });
  }
}
