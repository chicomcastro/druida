import { unlockedAbilities } from './skillTree.js';
import { ABILITIES } from './abilities/index.js';

/**
 * Hotbar 1–9 totalmente livre (E18). Cada slot guarda uma **entrada tipada** —
 * habilidade, forma, poção ou equipamento — que o jogador monta como quiser com
 * as teclas 1–9. Persistida em `game.progress.hotbar` (party) para salvar.
 *
 * Antes (E17) o array era só de ids de habilidade e as formas ocupavam uma faixa
 * fixa. Agora tudo é entrada tipada e qualquer coisa acionável vai em qualquer
 * slot. O `ensureHotbar` migra saves antigos (id de habilidade → entrada skill).
 */

export const HOTBAR_SIZE = 9;

export type HotbarKind = 'skill' | 'form' | 'potion' | 'equip';
export interface HotbarEntry {
  k: HotbarKind;
  /** skill: id da habilidade · form: id da forma · potion: nome do grupo · equip: uid do item. */
  id: string | number;
}

/** Slot inicial onde as formas são semeadas em jogo novo (teclas 5, 6, …). */
export const FORM_SEED_START = 4;

/** Duas entradas apontam para a mesma coisa? (para de-dup e destaque na HUD). */
export function sameEntry(a: HotbarEntry | null, b: HotbarEntry | null): boolean {
  return !!a && !!b && a.k === b.k && a.id === b.id;
}

/** Normaliza uma entrada de save antigo/estranho: string vira entrada skill. */
function coerce(v: any): HotbarEntry | null {
  if (!v) return null;
  if (typeof v === 'string') return { k: 'skill', id: v };            // save E17
  if (typeof v === 'object' && v.k && v.id !== undefined) return { k: v.k, id: v.id };
  return null;
}

/** Garante os 9 slots tipados no progresso, migrando save antigo. */
export function ensureHotbar(game): (HotbarEntry | null)[] {
  const p = game.progress || (game.progress = {});
  const prev = Array.isArray(p.hotbar) ? p.hotbar : [];
  if (!Array.isArray(p.hotbar) || p.hotbar.length !== HOTBAR_SIZE || p.hotbar.some((e) => typeof e === 'string')) {
    p.hotbar = Array.from({ length: HOTBAR_SIZE }, (_, i) => coerce(prev[i]));
  }
  return p.hotbar;
}

/** Entrada do slot (ou null). Slots fora de faixa devolvem null. */
export function hotbarEntry(game, slot: number): HotbarEntry | null {
  const hb = ensureHotbar(game);
  if (slot < 0 || slot >= HOTBAR_SIZE) return null;
  return hb[slot] ?? null;
}

/** Habilidade do slot, se for uma skill (conveniência p/ o cast). */
export function hotbarAbility(game, slot: number): string | null {
  const e = hotbarEntry(game, slot);
  return e && e.k === 'skill' ? String(e.id) : null;
}

/** Coloca uma entrada num slot, sem duplicar (remove a mesma de outros slots). */
export function setEntry(game, slot: number, entry: HotbarEntry): boolean {
  const hb = ensureHotbar(game);
  if (slot < 0 || slot >= HOTBAR_SIZE) return false;
  for (let i = 0; i < HOTBAR_SIZE; i++) if (sameEntry(hb[i], entry)) hb[i] = null;
  hb[slot] = entry;
  game.emit?.('hotbarChanged', { slot, entry });
  return true;
}

/**
 * Atribui uma habilidade a um slot. Só aceita habilidade **existente** e
 * **liberada** na árvore. Move sem duplicar. Devolve true no sucesso.
 */
export function assignSkill(game, slot: number, abilityId: string): boolean {
  if (!ABILITIES[abilityId]) return false;
  if (!unlockedAbilities(game).includes(abilityId)) return false;
  return setEntry(game, slot, { k: 'skill', id: abilityId });
}

/** Atribui uma forma a um slot (a validação de forma desbloqueada é do chamador). */
export function assignForm(game, slot: number, formId: string): boolean {
  return setEntry(game, slot, { k: 'form', id: formId });
}

/** Atribui um grupo de poção (pelo nome) a um slot. */
export function assignPotion(game, slot: number, name: string): boolean {
  return setEntry(game, slot, { k: 'potion', id: name });
}

/** Atribui um equipamento (pelo uid) a um slot. */
export function assignEquip(game, slot: number, uid: number): boolean {
  return setEntry(game, slot, { k: 'equip', id: uid });
}

/** Esvazia um slot. */
export function clearSlot(game, slot: number): boolean {
  const hb = ensureHotbar(game);
  if (slot < 0 || slot >= HOTBAR_SIZE) return false;
  hb[slot] = null;
  game.emit?.('hotbarChanged', { slot, entry: null });
  return true;
}

/** Coloca uma entrada no 1º slot livre (dentre `allowed`), se ainda não estiver. */
export function placeEntry(game, entry: HotbarEntry, allowed?: number[]): number {
  const hb = ensureHotbar(game);
  for (let i = 0; i < HOTBAR_SIZE; i++) if (sameEntry(hb[i], entry)) return i; // já está
  const slots = allowed ?? Array.from({ length: HOTBAR_SIZE }, (_, i) => i);
  for (const i of slots) {
    if (!hb[i]) { hb[i] = entry; game.emit?.('hotbarChanged', { slot: i, entry }); return i; }
  }
  return -1;
}

/**
 * Semeia as formas do jogador na barra (jogo novo / forma nova). Coloca cada
 * forma que ainda não está na barra no 1º slot livre a partir de FORM_SEED_START
 * — mantém a mão-de-obra muscular (formas nas teclas 5, 6, …) sem travá-las lá.
 */
export function seedForms(game, formList: string[]): void {
  const seedOrder = [
    ...Array.from({ length: HOTBAR_SIZE - FORM_SEED_START }, (_, i) => FORM_SEED_START + i),
    ...Array.from({ length: FORM_SEED_START }, (_, i) => i),
  ];
  for (const f of formList) placeEntry(game, { k: 'form', id: f }, seedOrder);
}

/**
 * Preenche slots vazios com as habilidades liberadas ainda não na barra —
 * conveniência ao liberar uma skill nova. Devolve quantas colocou.
 */
export function autoFillHotbar(game, allowed?: number[]): number {
  const hb = ensureHotbar(game);
  const slots = allowed ?? Array.from({ length: HOTBAR_SIZE }, (_, i) => i);
  const present = new Set(hb.filter((e) => e && e.k === 'skill').map((e) => e!.id));
  const pending = unlockedAbilities(game).filter((a) => !present.has(a));
  let placed = 0;
  for (const i of slots) {
    if (!pending.length) break;
    if (!hb[i]) { hb[i] = { k: 'skill', id: pending.shift()! }; placed++; }
  }
  if (placed) game.emit?.('hotbarChanged', { slot: -1, entry: null });
  return placed;
}

/**
 * Remove entradas órfãs: skills não mais liberadas, formas fora da lista e
 * equipamentos que não são mais possuídos. Cada filtro é opcional (passe só o
 * contexto que tiver à mão).
 */
export function pruneHotbar(game, opts: { forms?: string[]; ownedUids?: Set<number> } = {}): void {
  const hb = ensureHotbar(game);
  const skillOk = new Set(unlockedAbilities(game));
  const formOk = opts.forms ? new Set(opts.forms) : null;
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    const e = hb[i];
    if (!e) continue;
    if (e.k === 'skill' && !skillOk.has(String(e.id))) hb[i] = null;
    else if (e.k === 'form' && formOk && !formOk.has(String(e.id))) hb[i] = null;
    else if (e.k === 'equip' && opts.ownedUids && !opts.ownedUids.has(Number(e.id))) hb[i] = null;
  }
}
