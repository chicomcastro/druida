import type { ItemType, Modifier, Item } from '../types.js';

/**
 * Modificadores de item (ADR 0088): afixos que mudam a DINÂMICA do jogo, não
 * só números. Raros rolam 1, únicos 2. Cada afixo declara em que tipos pode
 * aparecer, se é estatística (agregada no equip) ou comportamento (lido pelo
 * sistema relevante), e como a magnitude escala com o nível.
 *
 * `kind: 'stat'` → somado em applyEquipment (dano/mitig/vida/velocidade/seiva).
 * `kind: 'behavior'` → lido on-demand (roubo de vida, espinhos, corte em área,
 * janela de combo). Mantê-los em data deixa o tuning barato.
 */
export interface ModDef {
  id: string;
  name: string;
  desc: string;
  types: ItemType[];
  kind: 'stat' | 'behavior';
  base: number;
  perLevel: number;
  /** unidade só para exibição (%, s, flat). */
  unit?: '%' | 's' | '';
  weight?: number;
}

export const MODIFIERS: Record<string, ModDef> = {
  // --- Armas -------------------------------------------------------------
  might: { id: 'might', name: 'Potência', desc: '+{v}% de dano', types: ['weapon', 'artifact'], kind: 'stat', base: 8, perLevel: 1.2, unit: '%' },
  lifesteal: { id: 'lifesteal', name: 'Sedento', desc: 'Cura {v}% do dano causado', types: ['weapon'], kind: 'behavior', base: 4, perLevel: 0.4, unit: '%' },
  cleave: { id: 'cleave', name: 'Ceifar', desc: 'Ataques básicos atingem em área ({v}u)', types: ['weapon'], kind: 'behavior', base: 1.6, perLevel: 0.05, unit: '' },
  tempo: { id: 'tempo', name: 'Cadência', desc: 'Janela de combo +{v}%', types: ['weapon'], kind: 'behavior', base: 6, perLevel: 0.6, unit: '%' },
  // --- Armaduras ---------------------------------------------------------
  bulwark: { id: 'bulwark', name: 'Baluarte', desc: '+{v}% de mitigação', types: ['armor'], kind: 'stat', base: 3, perLevel: 0.3, unit: '%' },
  vitality: { id: 'vitality', name: 'Vitalidade', desc: '+{v} de vida máxima', types: ['armor'], kind: 'stat', base: 12, perLevel: 2, unit: '' },
  swift: { id: 'swift', name: 'Ligeireza', desc: '+{v}% de velocidade', types: ['armor'], kind: 'stat', base: 4, perLevel: 0.3, unit: '%' },
  thorns: { id: 'thorns', name: 'Espinhos', desc: 'Reflete {v}% do dano recebido', types: ['armor'], kind: 'behavior', base: 10, perLevel: 1, unit: '%' },
  // --- Artefatos ---------------------------------------------------------
  wellspring: { id: 'wellspring', name: 'Manancial', desc: '+{v}% de regeneração de Seiva', types: ['artifact', 'armor'], kind: 'stat', base: 8, perLevel: 0.8, unit: '%' },
  echo: { id: 'echo', name: 'Eco', desc: 'Habilidades têm {v}% de chance de repetir', types: ['artifact'], kind: 'behavior', base: 6, perLevel: 0.6, unit: '%' },
};

/** Valor de um afixo no nível dado (arredondado a 1 casa quando fracionário). */
export function modValue(def: ModDef, level: number): number {
  const v = def.base + def.perLevel * Math.max(0, level - 1);
  return def.unit === '' && def.base < 3 ? +v.toFixed(2) : Math.round(v);
}

/** Sorteia `count` afixos distintos válidos para o tipo. */
export function rollModifiers(type: ItemType, count: number, level: number, rng: any): Modifier[] {
  if (count <= 0) return [];
  const pool = Object.values(MODIFIERS).filter((m) => m.types.includes(type));
  const out: Modifier[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = rng.int(0, pool.length - 1);
    const def = pool.splice(idx, 1)[0];
    out.push({ id: def.id, value: modValue(def, level) });
  }
  return out;
}

/** Texto legível de um modificador (substitui {v}). */
export function modText(mod: Modifier): string {
  const def = MODIFIERS[mod.id];
  if (!def) return '';
  return def.desc.replace('{v}', String(mod.value));
}

/** Soma o valor de um afixo em uma lista de itens equipados. */
export function sumMod(items: (Item | null | undefined)[], id: string): number {
  let total = 0;
  for (const it of items) {
    for (const m of (it as any)?.mods ?? []) if (m.id === id) total += m.value;
  }
  return total;
}
