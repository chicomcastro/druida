import { C } from '../core/ecs/components.js';

/**
 * Save/load em localStorage. Persiste progresso de grupo, passo da história e,
 * por jogador, formas/equipamento/inventário. Posição não é salva — ao
 * continuar, o grupo reaparece no hub (simplicidade do protótipo). O schema é
 * versionado (`v`) para migração futura → IndexedDB (ver backlog M8).
 */
const KEY = 'druida.save.v1';

export function serialize(game) {
  const players = [];
  for (const [id, pc] of game.world.query(C.PlayerControlled)) {
    const form = game.world.get(id, C.Form);
    const loadout = game.world.get(id, C.Loadout);
    const inv = game.world.get(id, C.Inventory);
    players.push({
      index: pc.index,
      forms: [...form.list],
      weapon: loadout.weapon,
      armor: loadout.armor,
      artifacts: loadout.artifacts.map((a) => a ?? null),
      essence: inv.essence,
      items: inv.items,
    });
  }
  return {
    v: 1,
    ts: Date.now(),
    seed: game.seed,
    progress: { ...game.progress },
    story: { step: game.story.step, kills: game.story.kills, spawned: { ...game.story._spawned } },
    players,
  };
}

export function apply(game, data) {
  if (!data || data.v !== 1) return false;
  game.progress = { ...data.progress };
  game.story.step = data.story.step ?? 0;
  game.story.kills = data.story.kills ?? 0;
  game.story._spawned = { ...(data.story.spawned ?? {}) };

  for (const [id, pc] of game.world.query(C.PlayerControlled)) {
    const sp = data.players.find((p) => p.index === pc.index);
    if (!sp) continue;
    const form = game.world.get(id, C.Form);
    form.list = sp.forms?.length ? sp.forms : ['humanoid', 'wolf'];
    if (!form.list.includes(form.current)) form.current = 'humanoid';

    const inv = game.world.get(id, C.Inventory);
    inv.essence = sp.essence ?? 0;
    inv.items = sp.items ?? [];

    const loadout = game.world.get(id, C.Loadout);
    const eq = game.world.get(id, C.Equipment);
    loadout.weapon = null; loadout.armor = null; loadout.artifacts = [null, null, null];
    eq.weapon = null; eq.armor = null; eq.artifacts = [null, null, null];
    if (sp.weapon) game.equip(id, sp.weapon);
    if (sp.armor) game.equip(id, sp.armor);
    (sp.artifacts ?? []).forEach((a, i) => { if (a) game.equip(id, a, i); });
  }
  return true;
}

export function saveToStorage(game) {
  try {
    localStorage.setItem(KEY, JSON.stringify(serialize(game)));
    return true;
  } catch {
    return false;
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
