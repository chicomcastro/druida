import * as THREE from 'three';
import { C } from '../core/ecs/components.js';
import { abilityBranch } from '../gameplay/skillTree.js';

/**
 * Efeitos visuais transitórios (anéis de AoE, arcos de golpe, marcadores de
 * meteoro, faíscas, trilhas de projétil e auras de status). Escuta eventos do
 * jogo e cria objetos Three.js de vida curta, atualizados/limpos por frame.
 * As partículas são recicladas via pool (ADR 0025).
 */

/**
 * Assinatura visual de conjuração por ramo da árvore de skills (E17.4). Ao
 * conjurar uma habilidade ativa, o ramo dispara um efeito característico no
 * conjurador — cada elemento com sua cor e "gesto" (jato pra cima, implosão,
 * poeira radial, etc.), dando identidade a cada ramo como pediu o playtest.
 * `mode` escolhe o gesto; `color` a cor base. Data-driven para ficar testável.
 */
export type CastMode = 'bloom' | 'jet' | 'implode' | 'nova' | 'stomp' | 'motes';
export const CAST_SIGNATURE: Record<string, { color: number; mode: CastMode }> = {
  natureza: { color: 0x6fae4f, mode: 'bloom' },   // esporos brotando do chão
  chama: { color: 0xff7a3a, mode: 'jet' },         // jato de fogo pra cima
  gelo: { color: 0x8ad0ff, mode: 'implode' },      // estilhaços convergindo
  tempestade: { color: 0xc9a8ff, mode: 'nova' },   // estouro radial rápido
  feras: { color: 0xd9c2a0, mode: 'stomp' },       // poeira/uivo rente ao chão
  vida: { color: 0x8affa0, mode: 'motes' },        // faíscas curativas subindo
};

/** Cor associada a um conjunto de status (faíscas/trilhas elementais). */
export function elementColor(effect: any): number | null {
  if (!effect) return null;
  if (effect.burn) return 0xff7a3a;
  if (effect.freeze) return 0x8ad0ff;
  if (effect.poison) return 0x9fe06a;
  if (effect.root) return 0x6fae4f;
  if (effect.stun) return 0xc9a8ff;
  return null;
}

export class VfxManager {
  game: any;
  scene: any;
  fx: any[];
  particles: any[];
  _pPool: any[];
  _pGeo: any;
  _statusT: number;
  _trailT: number;

  constructor(game) {
    this.game = game;
    this.scene = game.renderer.scene;
    this.fx = [];

    game.on('meleeSwing', (e) => this.swing(e));
    game.on('vfxRing', (e) => this.ring(e.x, e.z, e.radius, e.color));
    game.on('vfxMarker', (e) => this.marker(e.x, e.z, e.radius, e.delay));
    game.on('vfxCone', (e) => this.ring(e.x, e.z, 2.5, e.color, 0.25));
    game.on('formSwap', (e) => this.ring(e.x, e.z, 1.5, 0x9fe06a, 0.4));
    // Assinatura de conjuração por ramo (E17.4): só habilidades da árvore ativa
    // (com ramo conhecido) disparam — ataques básicos de forma são ignorados.
    game.on('cast', (e) => {
      const branch = e.abilityId ? abilityBranch(e.abilityId) : undefined;
      if (!branch) return;
      const tr = game.world?.get?.(e.id, C.Transform);
      if (tr) this.castSignature(tr.x, tr.z, branch);
    });
    game.on('dodge', (e) => this.ring(e.x, e.z, 1.0, 0xffffff, 0.25));
    // Telegraph de inimigo (ADR 0092): anel de aviso vermelho no windup.
    game.on('enemyTelegraph', (e) => this.marker(e.x, e.z, 1.4, e.dur ?? 0.35, 0xff5a4a));
    game.on('kill', (e) => {
      const c = e.bossName ? 0xb06bd0 : 0xff6a4a;
      this.burst(e.x, e.z, c, e.bossName ? 26 : 14);
      this.ring(e.x, e.z, e.bossName ? 4 : 2.2, c, 0.5);
      this.shockwave(e.x, e.z, e.bossName ? 5 : 2.8, c);
      this.flash(e.x, 0.9, e.z, c, e.bossName ? 1.6 : 0.9);
    });
    game.on('damage', (e) => {
      if (e.dot || e.x === undefined) return;
      const c = elementColor(e.effect) ?? e.color ?? 0xfff0a0;
      this.burst(e.x, e.z, c, 5);
      this.flash(e.x, 0.9, e.z, c, 0.55);
    });
    game.on('heal', (e) => {
      if ((e.amount ?? 0) < 3) return;
      const tr = game.world?.get?.(e.id, C.Transform);
      if (!tr) return;
      this.flash(tr.x, 1.0, tr.z, 0x8affa0, 0.5);
      for (let i = 0; i < 5; i++) {
        this._spawn(tr.x + (Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.5,
          tr.z + (Math.random() - 0.5) * 0.8, 0x8affa0, 0.6, 0, 1.6 + Math.random(), 0, 0.7);
      }
    });

    this.particles = [];
    // Pool de partículas: geometria compartilhada + meshes reciclados.
    this._pPool = [];
    this._pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    this._statusT = 0; // acumuladores p/ throttle de auras/trilhas
    this._trailT = 0;
  }

  _acquireParticle() {
    let m = this._pPool.pop();
    if (!m) {
      m = new THREE.Mesh(this._pGeo, new THREE.MeshBasicMaterial({ transparent: true }));
      this.scene.add(m);
    }
    m.visible = true;
    return m;
  }

  /** Cria uma partícula com posição/velocidade/escala explícitas. */
  _spawn(x, y, z, color, life, vx, vy, vz, scale = 1) {
    const m = this._acquireParticle();
    m.material.color.setHex(color);
    m.material.opacity = 1;
    m.scale.setScalar(scale);
    m.position.set(x, y, z);
    this.particles.push({ mesh: m, life, max: life, vx, vy, vz });
    if (this.particles.length > 260) this._killParticle(0);
  }

  /** Jato de partículas (caixas voxel) com gravidade e fade. */
  burst(x, z, color, count = 6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 3;
      this._spawn(x, 0.7, z, color, 0.5, Math.sin(a) * sp, 2 + Math.random() * 2, Math.cos(a) * sp);
    }
  }

  _killParticle(i) {
    const p = this.particles[i];
    p.mesh.visible = false; // recicla (não descarta)
    p.mesh.scale.setScalar(1);
    this._pPool.push(p.mesh);
    this.particles.splice(i, 1);
  }

  _add(mesh, life, update) {
    mesh.renderOrder = 2;
    this.scene.add(mesh);
    this.fx.push({ mesh, life, max: life, update });
  }

  ring(x, z, radius, color, life = 0.4) {
    const geo = new THREE.RingGeometry(radius * 0.2, radius * 0.3, 28);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.08, z);
    this._add(m, life, (fx, t) => {
      const s = 0.3 + (1 - t) * (radius / (radius * 0.3));
      m.scale.setScalar(s);
      mat.opacity = 0.8 * t;
    });
  }

  /** Clarão de impacto: cubo aditivo que incha e some em ~0.12s (ADR 0078). */
  flash(x, y, z, color, scale = 0.6) {
    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.setScalar(scale * 0.4);
    this._add(m, 0.14, (fx, t) => {
      m.scale.setScalar(scale * (0.4 + (1 - t) * 1.4));
      mat.opacity = 0.85 * t;
    });
  }

  /** Onda de choque no chão: anel fino aditivo que expande (mortes/explosões). */
  shockwave(x, z, radius, color) {
    const geo = new THREE.RingGeometry(0.82, 1.0, 36);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.1, z);
    this._add(m, 0.45, (fx, t) => {
      const k = 1 - t; // 0 -> 1 ao longo da vida
      m.scale.setScalar(0.3 + k * radius);
      mat.opacity = 0.9 * t * t;
    });
  }

  /**
   * Assinatura de conjuração por ramo (E17.4). Cada `mode` é um gesto distinto,
   * montado a partir das primitivas existentes (ring/flash/shockwave/partículas)
   * para dar personalidade visual a cada elemento sem custo de assets.
   */
  castSignature(x, z, branch) {
    const sig = CAST_SIGNATURE[branch];
    if (!sig) return;
    const { color, mode } = sig;
    if (mode === 'bloom') {
      // Natureza: anel verde e esporos brotando do solo.
      this.ring(x, z, 3.2, color, 0.5);
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 1.2;
        this._spawn(x + Math.sin(a) * r, 0.15, z + Math.cos(a) * r, color, 0.7,
          Math.sin(a) * 0.6, 2.6 + Math.random() * 1.2, Math.cos(a) * 0.6, 0.8);
      }
    } else if (mode === 'jet') {
      // Chama: clarão e jato de fogo pra cima.
      this.flash(x, 1.1, z, color, 0.8);
      for (let i = 0; i < 14; i++) {
        this._spawn(x + (Math.random() - 0.5) * 0.5, 0.5, z + (Math.random() - 0.5) * 0.5, color, 0.5,
          (Math.random() - 0.5) * 1.2, 5 + Math.random() * 3, (Math.random() - 0.5) * 1.2, 0.85);
      }
    } else if (mode === 'implode') {
      // Gelo: estilhaços convergindo para o centro + clarão ciano.
      this.flash(x, 0.9, z, color, 0.7);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r = 2.4;
        this._spawn(x + Math.sin(a) * r, 1.0 + Math.random() * 0.6, z + Math.cos(a) * r, color, 0.4,
          -Math.sin(a) * 7, 0.6, -Math.cos(a) * 7, 0.7);
      }
    } else if (mode === 'nova') {
      // Tempestade: estouro radial rápido rente ao chão + onda + clarão branco.
      this.shockwave(x, z, 3.4, color);
      this.flash(x, 1.0, z, 0xffffff, 0.7);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        this._spawn(x, 0.8, z, color, 0.32, Math.sin(a) * 8, 1.2, Math.cos(a) * 8, 0.7);
      }
    } else if (mode === 'stomp') {
      // Feras: poeira e uivo rente ao chão (onda baixa + poeira radial).
      this.shockwave(x, z, 2.8, color);
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 3 + Math.random() * 3;
        this._spawn(x, 0.3, z, color, 0.5, Math.sin(a) * sp, 0.8 + Math.random(), Math.cos(a) * sp, 0.9);
      }
    } else if (mode === 'motes') {
      // Vida: clarão suave e faíscas curativas subindo devagar.
      this.flash(x, 1.0, z, color, 0.6);
      this.ring(x, z, 2.4, color, 0.5);
      for (let i = 0; i < 10; i++) {
        this._spawn(x + (Math.random() - 0.5) * 1.0, 0.4 + Math.random() * 0.4, z + (Math.random() - 0.5) * 1.0,
          color, 0.7, 0, 1.8 + Math.random(), 0, 0.7);
      }
    }
  }

  swing({ x, z, angle, range = 2, arc = 1, color = 0xffffff }) {
    const geo = new THREE.RingGeometry(0.3, range, 18, 1, -arc, arc * 2);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -angle;
    m.position.set(x, 0.12, z);
    // Varredura: o arco gira no sentido do golpe enquanto some — leitura de
    // movimento em vez de um decalque estático.
    this._add(m, 0.22, (fx, t) => {
      m.rotation.z = -angle - (1 - t) * arc * 0.9;
      mat.opacity = 0.75 * t;
    });
    // Faíscas de impacto na ponta do golpe, na cor do elemento.
    const tipX = x + Math.sin(angle) * range * 0.8;
    const tipZ = z + Math.cos(angle) * range * 0.8;
    for (let i = 0; i < 3; i++) {
      const a = angle + (Math.random() - 0.5) * arc;
      this._spawn(tipX, 0.7, tipZ, color, 0.32, Math.sin(a) * 4, 1.5 + Math.random() * 2, Math.cos(a) * 4, 0.8);
    }
  }

  marker(x, z, radius, delay, color = 0xff5a2a) {
    const geo = new THREE.RingGeometry(radius * 0.9, radius, 28);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.06, z);
    this._add(m, delay, (fx, t) => { mat.opacity = 0.3 + 0.5 * (1 - t); });
  }

  /** Auras de status (queimando/congelado/envenenado) e trilhas de projétil. */
  _ambient(dt) {
    const world = this.game.world;
    if (!world) return;

    // Auras de status: drip leve a ~12 Hz nos afligidos.
    this._statusT += dt;
    if (this._statusT >= 0.08) {
      this._statusT = 0;
      for (const [, st, tr, hp] of world.query(C.StatusEffects, C.Transform, C.Health)) {
        if (hp.dead) continue;
        const c = elementColor(st);
        if (!c) continue;
        if (Math.random() < 0.6) {
          this._spawn(tr.x + (Math.random() - 0.5) * 0.6, 0.8 + Math.random() * 0.6, tr.z + (Math.random() - 0.5) * 0.6,
            c, 0.45, 0, st.freeze > 0 ? -0.3 : 0.8, 0, 0.7);
        }
      }
    }

    // Trilhas de projétil: rastro curto na cor do efeito.
    this._trailT += dt;
    if (this._trailT >= 0.04) {
      this._trailT = 0;
      for (const [, hb, tr] of world.query(C.Hitbox, C.Transform)) {
        const c = elementColor(hb.effect) ?? 0xdfe8ff;
        this._spawn(tr.x, 0.8, tr.z, c, 0.22, 0, 0, 0, 0.6);
      }
    }
  }

  update(dt) {
    this._ambient(dt);

    // Partículas: integra com gravidade e desaparece.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this._killParticle(i); continue; }
      p.vy -= 12 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.material.opacity = p.life / p.max;
    }

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const fx = this.fx[i];
      fx.life -= dt;
      const t = Math.max(0, fx.life / fx.max);
      fx.update?.(fx, t);
      if (fx.life <= 0) {
        this.scene.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        fx.mesh.material.dispose();
        this.fx.splice(i, 1);
      }
    }
  }
}
