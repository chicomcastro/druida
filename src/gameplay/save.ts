import { C } from '../core/ecs/components.js';
import { kvGet, kvSet, kvDel, kvGetLocal, kvSetLocal } from './storage.js';
import { emptyArmor } from './loot.js';
import type { SaveV1, PlayerSnapshot } from '../types.js';

/**
 * Save/load em IndexedDB (com fallback/espelho em localStorage — ADR 0024).
 * Persiste progresso de grupo, passo da história, posição do grupo e, por
 * jogador, formas/equipamento/inventário. O schema é versionado (`v`) para
 * migração futura.
 *
 * O salvamento é **automático** (`setupAutosave`): dispara em marcos do jogo
 * (nível, passo da história, forma desbloqueada, acampamento purificado,
 * fast-travel, vitória) com debounce e faz flush síncrono ao ocultar/fechar a
 * aba. O botão "Salvar" da pausa continua disponível como gravação manual.
 */
const KEY = 'druida.save.v1';
const AUTOSAVE_DEBOUNCE = 1500; // ms — coalesce vários gatilhos próximos

// Eventos que representam progresso digno de persistir.
const AUTOSAVE_EVENTS = ['levelUp', 'storyStep', 'formUnlocked', 'campPurified', 'fastTravel', 'victory', 'questCompleted', 'boonChosen', 'rested'];

export function serialize(game): SaveV1 {
  const players: PlayerSnapshot[] = [];
  for (const [id, pc] of game.world.query(C.PlayerControlled)) {
    const form = game.world.get(id, C.Form);
    const loadout = game.world.get(id, C.Loadout);
    const inv = game.world.get(id, C.Inventory);
    players.push({
      index: pc.index,
      forms: [...form.list],
      weapon: loadout.weapon,
      armor: { ...loadout.armor },
      artifacts: loadout.artifacts.map((a) => a ?? null),
      essence: inv.essence,
      items: inv.items,
      hotbar: (inv.hotbar ?? []).map((a) => a ?? null),
    });
  }
  return {
    v: 1,
    ts: Date.now(),
    seed: game.seed,
    groupCenter: game.groupCenter ? { ...game.groupCenter } : null,
    checkpoint: game.checkpoint ? { ...game.checkpoint } : null,
    progress: { ...game.progress },
    story: { step: game.story.step, kills: game.story.kills, spawned: { ...game.story._spawned } },
    fog: game.worldManager ? [...game.worldManager.explored] : [],
    chest: game.sharedChest ?? [],
    camps: game.poi ? [...game.poi.cleared] : [],
    lore: game.lore ? [...game.lore.found] : [],
    quests: game.quests?.serialize() ?? {},
    boons: game.boons ?? {},
    players,
  };
}

export function apply(game, data: SaveV1 | null | undefined): boolean {
  if (!data || data.v !== 1) return false;
  game.progress = { ...data.progress };
  game.story.step = data.story.step ?? 0;
  game.story.kills = data.story.kills ?? 0;
  game.story._spawned = { ...(data.story.spawned ?? {}) };
  if (data.fog && game.worldManager) game.worldManager.explored = new Set(data.fog);
  if (data.chest) game.sharedChest = data.chest;
  if (data.camps && game.poi) {
    game.poi.cleared = new Set(data.camps);
    for (const camp of game.poi.camps) if (game.poi.cleared.has(camp.id)) camp.cleared = true;
  }
  if (data.lore && game.lore) game.lore.found = new Set(data.lore);
  if (data.quests && game.quests) game.quests.restore(data.quests);
  if (data.boons) game.boons = { ...data.boons }; // antes do loop de players: applyEquipment lê os dons
  if (data.checkpoint) game.checkpoint = { ...data.checkpoint };
  // Reposiciona o grupo onde o save foi gravado (espalhado ao redor do centro).
  if (data.groupCenter) {
    game.groupCenter = { ...data.groupCenter };
    for (const [id, pc] of game.world.query(C.PlayerControlled)) {
      const tr = game.world.get(id, C.Transform);
      if (!tr) continue;
      tr.x = data.groupCenter.x + (pc.index % 2 ? 1.5 : -1.5);
      tr.z = data.groupCenter.z + Math.floor(pc.index / 2) * 1.5;
    }
  }

  for (const [id, pc] of game.world.query(C.PlayerControlled)) {
    const sp = data.players.find((p) => p.index === pc.index);
    if (!sp) continue;
    const form = game.world.get(id, C.Form);
    form.list = sp.forms?.length ? sp.forms : ['humanoid', 'wolf'];
    if (!form.list.includes(form.current)) form.current = 'humanoid';

    const inv = game.world.get(id, C.Inventory);
    inv.essence = sp.essence ?? 0;
    inv.items = sp.items ?? [];
    inv.hotbar = sp.hotbar ?? [null, null, null, null, null, null, null, null, null];

    const loadout = game.world.get(id, C.Loadout);
    const eq = game.world.get(id, C.Equipment);
    loadout.weapon = null; loadout.armor = emptyArmor(); loadout.artifacts = [null, null, null];
    eq.weapon = null; eq.armor = emptyArmor(); eq.artifacts = [null, null, null];
    if (sp.weapon) game.equip(id, sp.weapon);
    // Migração v1→v2 (ADR 0087): armadura única legada vai para o peito.
    if (sp.armor) {
      if ((sp.armor as any).type === 'armor') game.equip(id, { ...(sp.armor as any), slot: (sp.armor as any).slot ?? 'body' });
      else for (const piece of Object.values(sp.armor as any)) if (piece) game.equip(id, piece);
    }
    (sp.artifacts ?? []).forEach((a, i) => { if (a) game.equip(id, a, i); });
  }
  return true;
}

export async function saveToStorage(game) {
  try { return await kvSet(KEY, serialize(game)); } catch { return false; }
}

/** Gravação síncrona (localStorage) para o flush de saída de aba/página. */
export function saveSync(game) {
  try { return kvSetLocal(KEY, serialize(game)); } catch { return false; }
}

export async function loadFromStorage(): Promise<SaveV1 | null> {
  try {
    // kvGet já cai para localStorage quando não há IDB; mas um flush síncrono
    // em `pagehide` pode deixar o localStorage mais novo que o IDB. Escolhe o
    // mais recente por timestamp.
    const idb = await kvGet(KEY);
    const local = kvGetLocal(KEY);
    if (idb && local) return (local.ts ?? 0) > (idb.ts ?? 0) ? local : idb;
    return idb ?? local;
  } catch { return null; }
}

/**
 * Liga o autosave: grava em marcos do jogo (com debounce) e faz flush
 * síncrono ao ocultar/fechar a aba. Emite `saved` para feedback no HUD.
 * Idempotente por instância de `game`. Retorna `flush()` para uso manual.
 */
export function setupAutosave(game) {
  if (game._autosave) return game._autosave;
  let timer: any = null;

  const flush = () => {
    if (timer != null) { clearTimeout(timer); timer = null; }
    saveSync(game);                 // garante persistência imediata
    void saveToStorage(game);       // mantém o IDB em dia (assíncrono)
    game.emit?.('saved', {});
  };
  const schedule = () => {
    if (game.menuMain) return;      // ainda no menu principal: nada a salvar
    if (timer == null) timer = setTimeout(flush, AUTOSAVE_DEBOUNCE);
  };

  for (const ev of AUTOSAVE_EVENTS) game.on(ev, schedule);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !game.menuMain) flush();
    });
  }
  if (typeof addEventListener !== 'undefined') {
    addEventListener('pagehide', () => { if (!game.menuMain) flush(); });
  }

  game._autosave = { flush, schedule };
  return game._autosave;
}

export async function hasSave() {
  try { return !!(await kvGet(KEY)); } catch { return false; }
}

export async function clearSave() {
  try { await kvDel(KEY); } catch { /* noop */ }
}
