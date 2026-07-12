import * as THREE from 'three';

/**
 * Transparência por oclusão (E56/E64): o cenário ENTRE o jogador e a câmera sai
 * da frente para o herói nunca ficar escondido — casas, torres, Carvalho-Mãe,
 * árvores. Como a câmera é ortográfica, basta um raio de cada jogador rumo à
 * câmera; tudo que ele cruza ANTES de chegar ao jogador atrapalha.
 *
 * Duas famílias de obstáculo:
 *  - **Modelos** (grupos/malhas normais): ficam TRANSLÚCIDOS. E o modelo INTEIRO
 *    some junto, não só a parede que o raio tocou — a "unidade" é o filho direto
 *    do container de topo (a casa dentro do grupo-da-vila), então a casa toda
 *    esmaece como um só (antes só a malha atingida ficava translúcida — E64).
 *  - **Folhagem instanciada** (InstancedMesh, ex.: árvores da floresta): não dá
 *    pra deixar UMA instância translúcida (todas dividem 1 material/draw call),
 *    então a instância na frente ENCOLHE e some (recupera ao sair). Cada árvore
 *    é tronco+copa em instâncias diferentes, mas o raio cruza as duas → ambas
 *    sob a mira sao recolhidas.
 */
export class OcclusionFade {
  faded = new Map<any, { mats: any[]; cur: number; target: number }>();
  inst = new Map<string, { mesh: any; id: number; base: any; cur: number; target: number }>();
  _ray = new THREE.Raycaster();
  _origin = new THREE.Vector3();
  _dir = new THREE.Vector3();
  _p = new THREE.Vector3();
  _q = new THREE.Quaternion();
  _s = new THREE.Vector3();
  _m = new THREE.Matrix4();
  _tick = 0;
  fadeOpacity = 0.22; // translucidez do obstáculo (modelos)
  every = 3;          // recalcula os obstáculos a cada N frames (a transição roda todo frame)

  /**
   * @param scene cena Three
   * @param cam câmera (ortográfica)
   * @param players lista de { x, y, z } (posição dos jogadores)
   * @param entityRoots Set de Object3D a NUNCA sumir (jogador/inimigos/NPCs/loot)
   * @param dt segundos desde o último frame (transição)
   */
  update(scene: any, cam: any, players: { x: number; y: number; z: number }[], entityRoots: Set<any>, dt: number) {
    this._tick++;
    if (this._tick % this.every === 0 && players.length) {
      // Candidatos: filhos de topo visíveis que não são luz nem entidade. Inclui
      // grupos (o raycast recursivo varre suas malhas) e a folhagem instanciada.
      const candidates = scene.children.filter(
        (o: any) => o.visible && !(o instanceof THREE.Light) && !entityRoots.has(o),
      );
      const candSet = new Set<any>(candidates);
      const hitUnits = new Set<any>();
      for (const p of players) {
        this._origin.set(p.x, (p.y ?? 0) + 1.0, p.z); // mira o tronco do herói
        this._dir.subVectors(cam.position, this._origin).normalize();
        this._ray.set(this._origin, this._dir);
        this._ray.far = cam.position.distanceTo(this._origin) - 0.5;
        for (const h of this._ray.intersectObjects(candidates, true)) {
          const o = h.object;
          if (!o?.isMesh || !o.material || this._underEntity(o, entityRoots)) continue;
          if (o.isInstancedMesh) {
            // Descoberta (instância em tamanho cheio): registra p/ acompanhar. Se
            // decidíssemos ocultar SÓ pelo raio, a instância encolhida deixaria de
            // ser atingida e voltaria a crescer → piscava. O manter/soltar é
            // GEOMÉTRICO abaixo (pela posição-base), imune à escala atual.
            if (h.instanceId != null) this._ensureInst(o, h.instanceId, o.uuid + '#' + h.instanceId);
          } else {
            const unit = this._modelRoot(o, candSet);
            if (unit) hitUnits.add(unit);
          }
        }
      }
      for (const u of hitUnits) this._ensureUnit(u).target = this.fadeOpacity;
      for (const [u, r] of this.faded) if (!hitUnits.has(u)) r.target = 1;
      // Instâncias: alvo pela posição-base vs. o corredor herói→câmera.
      for (const [, r] of this.inst) r.target = this._instOccluding(r, players, cam) ? 0 : 1;
    }

    const k = Math.min(1, dt * 10);
    // Modelos: transição de opacidade; restaura o material ao voltar ao opaco.
    for (const [u, r] of this.faded) {
      r.cur += (r.target - r.cur) * k;
      if (r.target >= 1 && r.cur > 0.985) { this._restoreUnit(u); this.faded.delete(u); }
      else for (const m of r.mats) m.opacity = r.cur;
    }
    // Instâncias: transição de ESCALA (1 = cheia, →0 = some); restaura ao voltar.
    for (const [key, r] of this.inst) {
      r.cur += (r.target - r.cur) * k;
      if (r.target >= 1 && r.cur > 0.985) { this._applyInst(r, 1); this.inst.delete(key); }
      else this._applyInst(r, Math.max(0.001, r.cur));
    }
  }

  /** Algum ancestral é entidade (jogador/inimigo/NPC)? Então não mexe. */
  _underEntity(o: any, roots: Set<any>): boolean {
    for (let n = o; n; n = n.parent) if (roots.has(n)) return true;
    return false;
  }

  /**
   * "Modelo" da malha atingida = o filho DIRETO do container de topo (o grupo da
   * vila/mundo) no caminho até ela — ou seja, a casa inteira, não só a parede.
   * Malha solta no topo devolve ela mesma.
   */
  _modelRoot(obj: any, candSet: Set<any>): any {
    let node = obj, child = obj;
    while (node && !candSet.has(node)) { child = node; node = node.parent; }
    if (!node) return null;
    return node === obj ? obj : child;
  }

  /** Rastreia o modelo com TODAS as malhas clonadas (transparentes) uma vez. */
  _ensureUnit(unit: any) {
    let rec = this.faded.get(unit);
    if (!rec) {
      const mats: any[] = [];
      unit.traverse((o: any) => {
        if (!o.isMesh || o.isInstancedMesh || !o.material) return;
        if (!o.userData._occOn) {
          const orig = o.material;
          const clone = Array.isArray(orig) ? orig.map((m: any) => m.clone()) : orig.clone();
          const arr = Array.isArray(clone) ? clone : [clone];
          for (const m of arr) { m.transparent = true; m.depthWrite = false; }
          o.userData._occOrig = orig; o.userData._occOn = true; o.material = clone;
        }
        const cur = Array.isArray(o.material) ? o.material : [o.material];
        mats.push(...cur);
      });
      rec = { mats, cur: 1, target: this.fadeOpacity };
      this.faded.set(unit, rec);
    }
    return rec;
  }

  /** Devolve o material original de todas as malhas do modelo. */
  _restoreUnit(unit: any) {
    unit.traverse((o: any) => {
      if (o.isMesh && o.userData._occOn) {
        o.material = o.userData._occOrig; o.userData._occOn = false; o.userData._occOrig = null;
      }
    });
  }

  /** Guarda a matriz-base + posição-mundo + raio da instância (p/ encolher/manter). */
  _ensureInst(mesh: any, id: number, key: string) {
    if (this.inst.has(key)) return;
    const base = new THREE.Matrix4();
    mesh.getMatrixAt(id, base);
    base.decompose(this._p, this._q, this._s);
    const pos = this._p.clone().applyMatrix4(mesh.matrixWorld); // mundo da instância
    const geomR = mesh.geometry?.boundingSphere?.radius ?? 2;
    const rad = geomR * Math.max(this._s.x, this._s.y, this._s.z || 1);
    this.inst.set(key, { mesh, id, base, cur: 1, target: 0, pos, rad } as any);
  }

  /** A instância (pela posição-base) está no corredor herói→câmera? */
  _instOccluding(r: any, players: { x: number; y: number; z: number }[], cam: any): boolean {
    for (const p of players) {
      this._origin.set(p.x, (p.y ?? 0) + 1.0, p.z);
      if (this._segDist2(this._origin, cam.position, r.pos) < r.rad * r.rad) return true;
    }
    return false;
  }

  /** Distância² de um ponto ao segmento a-b. */
  _segDist2(a: any, b: any, pt: any): number {
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
    const apx = pt.x - a.x, apy = pt.y - a.y, apz = pt.z - a.z;
    const len2 = abx * abx + aby * aby + abz * abz || 1e-6;
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / len2));
    const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
    return dx * dx + dy * dy + dz * dz;
  }

  /** Aplica um fator de escala (1 = original) à instância. */
  _applyInst(r: any, factor: number) {
    if (factor >= 1) { r.mesh.setMatrixAt(r.id, r.base); }
    else {
      r.base.decompose(this._p, this._q, this._s);
      this._m.compose(this._p, this._q, this._s.clone().multiplyScalar(factor));
      r.mesh.setMatrixAt(r.id, this._m);
    }
    r.mesh.instanceMatrix.needsUpdate = true;
  }
}
