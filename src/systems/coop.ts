import { C } from '../core/ecs/components.js';
import { dist } from '../utils/math.js';
import { createPlayer } from '../entities/factories.js';

/**
 * Coop local same-screen: entrada de jogadores via gamepad, queda/revive,
 * respawn/wipe, e cálculo do centróide+dispersão do grupo para a câmera.
 * Ver docs/adr/0003-coop-camera.md.
 */
export function coopSystem(game, dt) {
  const { world } = game;

  handleJoins(game);

  // Queda e revive
  const players = [...world.query(C.PlayerControlled, C.Transform, C.Health)];
  const active = players.filter(([, pc, , hp]) => !pc.downed && !hp.dead);

  for (const [id, pc, tr, hp] of players) {
    if (!pc.downed) continue;
    pc.downedTimer -= dt;

    // Aliado por perto revive.
    let reviver = null;
    for (const [aid, aTr, apc, ahp] of world.query(C.Transform, C.PlayerControlled, C.Health)) {
      if (aid === id || apc.downed || ahp.dead) continue;
      if (dist(tr.x, tr.z, aTr.x, aTr.z) < 2.0) { reviver = aid; break; }
    }
    if (reviver) {
      pc.reviveProgress += dt / 2.5; // ~2.5s para reviver
      if (pc.reviveProgress >= 1) revive(game, id, 0.5);
    } else {
      pc.reviveProgress = Math.max(0, pc.reviveProgress - dt * 0.5);
    }

    if (pc.downedTimer <= 0) {
      // Sangrou: morre de vez. Se ainda há aliado vivo, vira espectador até wipe.
      hp.dead = true;
    }
  }

  // Wipe: todos caídos/mortos -> respawn do grupo no checkpoint.
  if (players.length > 0 && active.length === 0) {
    game.emit('wipe', {});
    const cp = game.checkpoint ?? { x: 0, z: 0 };
    for (const [, pc, tr, hp] of players) {
      pc.downed = false; pc.downedTimer = 0; pc.reviveProgress = 0;
      hp.dead = false; hp.hp = hp.max * 0.6; hp.invuln = 2;
      tr.x = cp.x + (Math.random() - 0.5) * 2;
      tr.z = cp.z + (Math.random() - 0.5) * 2;
    }
  }

  // Centróide + dispersão para a câmera.
  let sx = 0, sz = 0, n = 0, maxD = 0;
  const live = active.length ? active : players;
  for (const [, , tr] of live) { sx += tr.x; sz += tr.z; n++; }
  if (n > 0) {
    const cx = sx / n, cz = sz / n;
    for (const [, , tr] of live) maxD = Math.max(maxD, dist(cx, cz, tr.x, tr.z));
    game.groupCenter = { x: cx, z: cz };
    game.groupSpread = maxD;
  }
}

function handleJoins(game) {
  const { world, input } = game;
  const count = [...world.query(C.PlayerControlled)].length;
  if (count >= 4) return;
  const pads = input.connectedPads();
  for (const pad of pads) {
    if (game._assignedPads.has(pad.index)) continue;
    // Entra apertando START (botão 9): um gamepad livre controla o P1 por
    // padrão (tablet/controle dedicado — ADR 0053), então qualquer-botão
    // criaria um P2 fantasma no primeiro ataque.
    const pressed = pad.buttons[9]?.pressed;
    if (!pressed) continue;
    const index = [...world.query(C.PlayerControlled)].length;
    if (index >= 4) break;
    const center = game.groupCenter ?? { x: 0, z: 0 };
    const id = createPlayer(world, game.renderer, { index, x: center.x + 2, z: center.z });
    game.setupNewPlayer?.(id, index);
    input.assignPad(index, pad.index);
    game._assignedPads.add(pad.index);
    game.emit('playerJoined', { id, index });
  }
}

function revive(game, id, hpFrac) {
  const pc = game.world.get(id, C.PlayerControlled);
  const hp = game.world.get(id, C.Health);
  pc.downed = false; pc.downedTimer = 0; pc.reviveProgress = 0;
  hp.dead = false; hp.hp = hp.max * hpFrac; hp.invuln = 1.5;
  game.emit('revived', { id });
}
