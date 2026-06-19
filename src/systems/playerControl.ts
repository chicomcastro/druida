import { C } from '../core/ecs/components.js';
import { normalize, angleTo } from '../utils/math.js';
import { FORMS } from '../gameplay/forms.js';
import { castAbility } from '../gameplay/abilities/index.js';

/**
 * Traduz o Intent (preenchido a partir do input) em movimento, mira, ataque,
 * dodge, artefatos e troca de forma. Respeita estados (downed, stun, root).
 */
export function playerControlSystem(game, dt) {
  const { world } = game;
  for (const [id, pc, intent, tr, vel, st] of world.query(
    C.PlayerControlled, C.Intent, C.Transform, C.Velocity, C.StatusEffects,
  )) {
    pc.dodgeTimer = Math.max(0, pc.dodgeTimer - dt);
    pc.attackTimer = Math.max(0, pc.attackTimer - dt);

    if (pc.downed) {
      vel.vx = vel.vz = 0;
      continue;
    }

    const form = world.get(id, C.Form);
    const formDef = FORMS[form.current];

    // Orientação -------------------------------------------------------
    // Por padrão o personagem olha para onde se move; parado, mantém a última
    // direção. As mira explícita (mundo/stick) ainda é suportada caso algum
    // input volte a fornecê-la, mas o controle atual não usa cursor.
    let aimAngle = pc.facing;
    if (intent.aimIsWorldPoint) {
      aimAngle = angleTo(tr.x, tr.z, intent.aimX, intent.aimZ);
    } else if (intent.hasAim) {
      aimAngle = Math.atan2(intent.aimX, intent.aimZ);
    } else if (intent.moveX || intent.moveZ) {
      aimAngle = Math.atan2(intent.moveX, intent.moveZ);
    }
    pc.facing = aimAngle;
    tr.rot = aimAngle;

    // Troca de forma ---------------------------------------------------
    if (intent.switchForm > 0) {
      const wanted = form.list[intent.switchForm - 1];
      if (wanted && wanted !== form.current) {
        form.current = wanted;
        form.swapFlash = 0.35;
        game.emit('formSwap', { id, form: wanted, x: tr.x, z: tr.z });
      } else if (wanted === form.current && wanted !== 'humanoid') {
        form.current = 'humanoid'; // alternar de volta
        form.swapFlash = 0.35;
      }
    }

    // Movimento --------------------------------------------------------
    const rooted = st.root > 0 || st.stun > 0;
    const slow = st.freeze > 0 ? 0.5 : 1;
    const n = normalize(intent.moveX, intent.moveZ);
    const speed = vel.speed * (formDef.speedMul ?? 1) * slow;

    if (pc.dodgeTimer > 0) {
      // Durante o dodge mantém a velocidade do impulso (definida abaixo).
    } else if (!rooted) {
      vel.vx = n.x * speed;
      vel.vz = n.z * speed;
    } else {
      vel.vx = vel.vz = 0;
    }

    // Dodge (roll com i-frames) ---------------------------------------
    if (intent.dodge && pc.dodgeTimer <= 0 && !rooted) {
      const dx = n.len > 0 ? n.x : Math.sin(aimAngle);
      const dz = n.len > 0 ? n.z : Math.cos(aimAngle);
      vel.vx = dx * speed * 2.6;
      vel.vz = dz * speed * 2.6;
      pc.dodgeTimer = 0.32;
      const hp = world.get(id, C.Health);
      hp.invuln = Math.max(hp.invuln, 0.3);
      game.emit('dodge', { id, x: tr.x, z: tr.z });
    }

    // Ataque básico (depende da forma) --------------------------------
    if (intent.attack && pc.attackTimer <= 0 && st.stun <= 0) {
      pc.attackTimer = formDef.attackCooldown;
      castAbility(game, id, formDef.basic, aimAngle);
    }

    // Artefatos (3 slots) ---------------------------------------------
    const loadout = world.get(id, C.Loadout);
    for (let i = 0; i < 3; i++) {
      if (!intent.artifact[i]) continue;
      const art = loadout.artifacts[i];
      if (art) castAbility(game, id, art.ability, aimAngle, { slot: i, item: art });
    }
  }
}
