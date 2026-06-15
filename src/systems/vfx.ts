import * as THREE from 'three';

/**
 * Efeitos visuais transitórios (anéis de AoE, arcos de golpe, marcadores de
 * meteoro, flashes). Escuta eventos do jogo e cria objetos Three.js de vida
 * curta, atualizados/limpos por frame. Pooling fica para o polimento (M9).
 */
export class VfxManager {
  [key: string]: any;
  constructor(game) {
    this.game = game;
    this.scene = game.renderer.scene;
    this.fx = [];

    game.on('meleeSwing', (e) => this.swing(e));
    game.on('vfxRing', (e) => this.ring(e.x, e.z, e.radius, e.color));
    game.on('vfxMarker', (e) => this.marker(e.x, e.z, e.radius, e.delay));
    game.on('vfxCone', (e) => this.ring(e.x, e.z, 2.5, e.color, 0.25));
    game.on('formSwap', (e) => this.ring(e.x, e.z, 1.5, 0x9fe06a, 0.4));
    game.on('dodge', (e) => this.ring(e.x, e.z, 1.0, 0xffffff, 0.25));
    game.on('kill', (e) => this.burst(e.x, e.z, 0xff6a4a, 10));
    game.on('damage', (e) => { if (e.dot || e.x === undefined) return; this.burst(e.x, e.z, 0xfff0a0, 4); });

    this.particles = [];
  }

  /** Pequeno jato de partículas (caixas voxel) com gravidade e fade. */
  burst(x, z, color, count = 6) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        new THREE.MeshBasicMaterial({ color, transparent: true }),
      );
      m.position.set(x, 0.7, z);
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 3;
      this.scene.add(m);
      this.particles.push({
        mesh: m, life: 0.5, max: 0.5,
        vx: Math.sin(a) * sp, vy: 2 + Math.random() * 2, vz: Math.cos(a) * sp,
      });
      if (this.particles.length > 220) this._killParticle(0);
    }
  }

  _killParticle(i) {
    const p = this.particles[i];
    this.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
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

  swing({ x, z, angle, range = 2, arc = 1, color = 0xffffff }) {
    const geo = new THREE.RingGeometry(0.3, range, 16, 1, -arc, arc * 2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -angle;
    m.position.set(x, 0.12, z);
    this._add(m, 0.18, (fx, t) => { mat.opacity = 0.45 * t; });
  }

  marker(x, z, radius, delay) {
    const geo = new THREE.RingGeometry(radius * 0.9, radius, 28);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.06, z);
    this._add(m, delay, (fx, t) => { mat.opacity = 0.3 + 0.5 * (1 - t); });
  }

  update(dt) {
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
