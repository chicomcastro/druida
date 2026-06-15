/**
 * Spatial hash uniforme para broadphase em 2D (plano XZ). Acelera consultas de
 * vizinhança (colisão, projéteis) de O(n²) para ~O(n) com distribuição esparsa.
 * Ver docs/adr/0015-performance.md.
 */
export class SpatialHash {
  cell: number;
  map: Map<string, number[]>;

  constructor(cell = 4) {
    this.cell = cell;
    this.map = new Map();
  }

  clear() {
    this.map.clear();
  }

  _key(cx: number, cz: number) {
    return cx * 73856093 + cz; // hash barato e estável
  }

  insert(id: number, x: number, z: number) {
    const k = this._key(Math.floor(x / this.cell), Math.floor(z / this.cell));
    let arr = this.map.get(k as unknown as string);
    if (!arr) this.map.set(k as unknown as string, (arr = []));
    arr.push(id);
  }

  /** Ids candidatos num raio em torno de (x,z). Pode incluir falsos positivos. */
  queryRadius(x: number, z: number, r: number, out: number[] = []): number[] {
    const minx = Math.floor((x - r) / this.cell);
    const maxx = Math.floor((x + r) / this.cell);
    const minz = Math.floor((z - r) / this.cell);
    const maxz = Math.floor((z + r) / this.cell);
    for (let cx = minx; cx <= maxx; cx++) {
      for (let cz = minz; cz <= maxz; cz++) {
        const arr = this.map.get(this._key(cx, cz) as unknown as string);
        if (arr) for (const id of arr) out.push(id);
      }
    }
    return out;
  }
}
