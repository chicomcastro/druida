/**
 * ECS mínimo e data-oriented.
 *
 * - Entidade = um id inteiro.
 * - Componente = objeto de dados puro, guardado num Map por tipo.
 * - Sistema = função `(world, dt, ctx) => void` registrada no Game.
 *
 * Query simples por interseção de conjuntos de componentes. Suficiente para
 * a escala do protótipo (centenas/poucos milhares de entidades) — ver
 * docs/adr/0002-ecs.md.
 */
export class World {
  /** próximo id de entidade */
  _nextId: number;
  /** tipo -> (entidade -> componente) */
  stores: Map<string, Map<number, any>>;
  /** entidades vivas */
  entities: Set<number>;
  /** fila de remoção diferida */
  _toDestroy: Set<number>;
  /** event bus: evento -> handlers */
  _listeners: Map<string, Array<(payload?: any, world?: World) => void>>;

  constructor() {
    this._nextId = 1;
    /** @type {Map<string, Map<number, any>>} tipo -> (entidade -> componente) */
    this.stores = new Map();
    /** entidades vivas */
    this.entities = new Set();
    /** fila de remoção diferida (evita mutar durante iteração) */
    this._toDestroy = new Set();
    /** event bus simples para comunicação entre sistemas */
    this._listeners = new Map();
  }

  createEntity() {
    const id = this._nextId++;
    this.entities.add(id);
    return id;
  }

  destroyEntity(id) {
    this._toDestroy.add(id);
  }

  /** Aplica remoções enfileiradas. Chamado uma vez por frame pelo Game. */
  flushDestroyed() {
    if (this._toDestroy.size === 0) return;
    for (const id of this._toDestroy) {
      for (const store of this.stores.values()) store.delete(id);
      this.entities.delete(id);
    }
    this._toDestroy.clear();
  }

  _store(type) {
    let s = this.stores.get(type);
    if (!s) {
      s = new Map();
      this.stores.set(type, s);
    }
    return s;
  }

  add(id, type, data = {}) {
    this._store(type).set(id, data);
    return data;
  }

  remove(id, type) {
    this.stores.get(type)?.delete(id);
  }

  get(id, type) {
    return this.stores.get(type)?.get(id);
  }

  has(id, type) {
    return this.stores.get(type)?.has(id) ?? false;
  }

  /**
   * Itera entidades que possuem TODOS os componentes pedidos.
   * Uso: for (const [id, pos, vel] of world.query('Transform', 'Velocity')) {}
   */
  *query(...types) {
    if (types.length === 0) return;
    // Começa pelo menor store para minimizar iterações.
    let smallest = this._store(types[0]);
    for (const t of types) {
      const s = this._store(t);
      if (s.size < smallest.size) smallest = s;
    }
    outer: for (const id of smallest.keys()) {
      const comps = [id];
      for (const t of types) {
        const c = this.stores.get(t)?.get(id);
        if (c === undefined) continue outer;
        comps.push(c);
      }
      yield comps;
    }
  }

  /** Primeira entidade com os componentes dados, ou null. */
  first(...types) {
    for (const tuple of this.query(...types)) return tuple;
    return null;
  }

  // --- Event bus -----------------------------------------------------------
  on(event, fn) {
    let arr = this._listeners.get(event);
    if (!arr) this._listeners.set(event, (arr = []));
    arr.push(fn);
    return () => {
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  emit(event, payload?) {
    const arr = this._listeners.get(event);
    if (!arr) return;
    for (const fn of arr) fn(payload, this);
  }
}
