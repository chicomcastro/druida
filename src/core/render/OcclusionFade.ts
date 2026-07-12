import * as THREE from 'three';

/**
 * Transparência por oclusão (E56): o cenário que fica ENTRE o jogador e a câmera
 * some (fica translúcido) para o herói nunca ficar escondido — a Carvalho-Mãe,
 * casas, torres etc. deixam de tapar a visão. Como a câmera é ortográfica (raios
 * paralelos), basta um raio de cada jogador em direção à câmera: as malhas que ele
 * atinga ANTES de chegar ao jogador são exatamente o que atrapalha, então elas
 * recebem opacidade baixa; ao sair da frente, voltam ao normal (com transição
 * suave). Criaturas (jogador/inimigos/NPCs) e a folhagem instanciada não somem.
 *
 * Só mexe em materiais (clona 1× por malha e cacheia), então nunca vaza opacidade
 * para outras malhas que compartilhem o mesmo material.
 */
export class OcclusionFade {
  faded = new Map<any, { orig: any; mats: any[]; cur: number; target: number }>();
  _ray = new THREE.Raycaster();
  _origin = new THREE.Vector3();
  _dir = new THREE.Vector3();
  _tick = 0;
  fadeOpacity = 0.22; // quão translúcido fica o obstáculo
  every = 3;          // recalcula os obstáculos a cada N frames (lerp roda todo frame)

  /**
   * @param scene cena Three
   * @param cam câmera (ortográfica)
   * @param players lista de { x, y, z } (posição dos jogadores)
   * @param entityRoots Set de Object3D a NUNCA apagar (jogador/inimigos/NPCs/loot)
   * @param dt segundos desde o último frame (transição)
   */
  update(scene: any, cam: any, players: { x: number; y: number; z: number }[], entityRoots: Set<any>, dt: number) {
    this._tick++;
    if (this._tick % this.every === 0 && players.length) {
      const hit = new Set<any>();
      // Candidatos: filhos de topo que NÃO são luz, folhagem instanciada nem
      // entidade (jogador/inimigo/NPC/loot). Grupos entram (o raycast recursivo
      // varre as malhas dentro deles — casas, Carvalho-Mãe). Chão/céu ficam de
      // fora pela geometria (o raio sobe) e pela distância (far até a câmera).
      const candidates = scene.children.filter((o: any) =>
        o.visible && !(o instanceof THREE.Light) && !(o instanceof THREE.InstancedMesh) && !entityRoots.has(o),
      );
      for (const p of players) {
        this._origin.set(p.x, (p.y ?? 0) + 1.0, p.z); // mira o tronco do herói
        this._dir.subVectors(cam.position, this._origin).normalize();
        this._ray.set(this._origin, this._dir);
        this._ray.far = cam.position.distanceTo(this._origin) - 0.5;
        const hits = this._ray.intersectObjects(candidates, true);
        for (const h of hits) if (this._fadeable(h.object, entityRoots)) hit.add(h.object);
      }
      // Alvo: obstáculo atingido → translúcido; o resto → volta a opaco.
      for (const mesh of hit) this._ensure(mesh).target = this.fadeOpacity;
      for (const [mesh, rec] of this.faded) if (!hit.has(mesh)) rec.target = 1;
    }
    // Transição suave da opacidade, todo frame.
    const k = Math.min(1, dt * 10);
    for (const [mesh, rec] of this.faded) {
      rec.cur += (rec.target - rec.cur) * k;
      if (rec.target >= 1 && rec.cur > 0.985) { // voltou ao opaco: restaura o material original
        mesh.material = rec.orig; this.faded.delete(mesh);
      } else {
        for (const m of rec.mats) m.opacity = rec.cur;
      }
    }
  }

  /** Malha "de cenário" apagável: é Mesh (não instanciada) e não pertence a nenhuma entidade. */
  _fadeable(obj: any, entityRoots: Set<any>): boolean {
    if (!obj?.isMesh || obj instanceof THREE.InstancedMesh || !obj.material) return false;
    for (let o = obj; o; o = o.parent) if (entityRoots.has(o)) return false;
    return true;
  }

  /** Garante a malha rastreada com material clonado (transparente), sem vazar p/ compartilhados. */
  _ensure(mesh: any) {
    let rec = this.faded.get(mesh);
    if (!rec) {
      const orig = mesh.material;
      const clone = Array.isArray(orig) ? orig.map((m: any) => m.clone()) : orig.clone();
      const mats = Array.isArray(clone) ? clone : [clone];
      for (const m of mats) { m.transparent = true; m.depthWrite = false; }
      mesh.material = clone;
      rec = { orig, mats, cur: 1, target: this.fadeOpacity };
      this.faded.set(mesh, rec);
    }
    return rec;
  }
}
