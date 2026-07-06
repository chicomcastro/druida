import { C } from '../core/ecs/components.js';
import { speedBoonMul, iframeBoonMul } from '../gameplay/boons.js';
import { normalize, angleTo } from '../utils/math.js';
import { FORMS } from '../gameplay/forms.js';
import { castAbility } from '../gameplay/abilities/index.js';
import { evalCombo } from '../gameplay/combo.js';
import { COMBO } from '../gameplay/combo.js';
import { skillBonus, gainProficiency } from '../gameplay/skills.js';
import { hotbarEntry } from '../gameplay/hotbar.js';
import { useConsumableNamed } from '../gameplay/consumables.js';

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
    // Decaimento do combo (ADR 0092): sem novo acerto na janela de graça, zera.
    if (pc.combo > 0) {
      pc.comboExpire = (pc.comboExpire ?? 0) - dt;
      if (pc.comboExpire <= 0) { pc.combo = 0; game.emit('comboEnd', { id }); }
    }

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
    const eqMove = world.get(id, C.Equipment)?.speedMul ?? 1; // afixo Ligeireza (ADR 0088)
    const speed = vel.speed * (formDef.speedMul ?? 1) * slow * speedBoonMul(game) * eqMove; // Asas do Vento (ADR 0050)

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
      hp.invuln = Math.max(hp.invuln, 0.3 * iframeBoonMul(game)); // Presságio (ADR 0050)
      game.emit('dodge', { id, x: tr.x, z: tr.z });
    }

    // Ataque básico + combo por timing (ADR 0092) ---------------------
    // Edge de PRESS (não auto-fire): o timing do jogador é o que importa.
    const pressed = intent.attack && !pc._atkHeld;
    pc._atkHeld = intent.attack;
    if (st.stun <= 0 && pressed) {
      // Talentos (ADR 0093): velocidade de ataque encurta a janela; foco de
      // arma/forma amplia a janela do sweet spot; proficiência acumula.
      const spd = skillBonus(game, id, 'atkSpeed') / 100;
      const total = formDef.attackCooldown * (1 - Math.min(0.4, spd));
      const widen = skillBonus(game, id, 'combo') / 100;
      const eq = world.get(id, C.Equipment);
      const track = form.current !== 'humanoid' ? form.current : eq?.weapon?.family;
      if (track) gainProficiency(game, track);
      if (pc.attackTimer <= 0) {
        // Primeiro golpe da sequência: abre a janela de combo.
        pc.attackTimer = total; pc.castTotal = total;
        castAbility(game, id, formDef.basic, aimAngle);
      } else {
        // Cast em andamento: avalia o timing do encadeamento.
        const p = 1 - pc.attackTimer / (pc.castTotal || total);
        const r = evalCombo(p, widen);
        if (r.ok) {
          pc.combo = Math.min((pc.combo ?? 0) + 1, COMBO.cap);
          pc.comboExpire = total * COMBO.graceMul;
          pc.attackTimer = total; pc.castTotal = total;
          castAbility(game, id, formDef.basic, aimAngle);
          game.emit('combo', { id, count: pc.combo, quality: r.quality });
        } else {
          pc.combo = 0;
          pc.attackTimer = Math.min(pc.castTotal || total, pc.attackTimer + COMBO.missPenalty);
          game.emit('comboBreak', { id, progress: p });
        }
      }
    }

    // Artefatos (3 slots) ---------------------------------------------
    const loadout = world.get(id, C.Loadout);
    for (let i = 0; i < 3; i++) {
      if (!intent.artifact[i]) continue;
      const art = loadout.artifacts[i];
      if (art) castAbility(game, id, art.ability, aimAngle, { slot: i, item: art });
    }

    // Hotbar livre (teclas 1–9, E18) ---------------------------------
    // Cada slot é uma entrada tipada acionável: skill → conjura; form → troca
    // (com toggle de volta ao humanoide); potion → bebe da mochila pelo nome;
    // equip → troca de equipamento (E18.2). Só do P1 (hotbar em game.progress);
    // o d-pad do gamepad segue trocando forma via switchForm.
    if (intent.hotbar) {
      for (let s = 0; s < intent.hotbar.length; s++) {
        if (!intent.hotbar[s]) continue;
        const e = hotbarEntry(game, s);
        if (!e) continue;
        if (e.k === 'skill') {
          castAbility(game, id, String(e.id), aimAngle, { slot: s, hotbar: true });
        } else if (e.k === 'form') {
          const wanted = String(e.id);
          if (form.list.includes(wanted) && wanted !== form.current) {
            form.current = wanted;
            form.swapFlash = 0.35;
            game.emit('formSwap', { id, form: wanted, x: tr.x, z: tr.z });
          } else if (wanted === form.current && wanted !== 'humanoid') {
            form.current = 'humanoid';
            form.swapFlash = 0.35;
          }
        } else if (e.k === 'potion') {
          useConsumableNamed(game, id, String(e.id));
        } else if (e.k === 'equip') {
          // Troca de arma/armadura por tecla, com swap-back: o item equipado
          // volta para a mochila em vez de sumir (E18.2).
          const inv = world.get(id, C.Inventory);
          const item = inv?.items?.find((it) => it?.uid === e.id);
          if (item) {
            const lo = world.get(id, C.Loadout);
            const displaced = item.type === 'weapon' ? lo.weapon
              : item.type === 'armor' ? lo.armor?.[item.slot ?? 'body'] : null;
            inv.items.splice(inv.items.indexOf(item), 1);
            game.equip(id, item);
            if (displaced && displaced.uid !== item.uid) inv.items.push(displaced);
            game.emit('itemEquipped', { id, item });
          }
        }
      }
    }
  }
}
