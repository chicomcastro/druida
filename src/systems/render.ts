import { C } from '../core/ecs/components.js';
import { FORMS } from '../gameplay/forms.js';
import { buildMesh } from '../entities/meshes.js';
import { animateBody } from './animation.js';

/**
 * Sincroniza Transform -> Object3D do Three.js. Roda no render (não na
 * simulação) para suavidade. Também troca o mesh do corpo ao mudar de forma,
 * aplica o flash de dano, a aura de status, a flutuação do loot e a animação
 * procedural das partes (idle/andar/atacar — ver systems/animation.ts).
 */
export function renderSyncSystem(game, alpha) {
  const { world } = game;
  const now = performance.now();
  const t = now / 1000;
  const adt = Math.min(0.05, (now - (game._animLast ?? now)) / 1000);
  game._animLast = now;

  for (const [id, tr, r] of world.query(C.Transform, C.Renderable)) {
    const obj = r.object3d;
    const y = r.yOffset ?? 0;
    obj.position.set(tr.x, y + (r.bob ? Math.sin(t * 3 + id) * 0.12 + 0.12 : 0), tr.z);
    if (tr.rot !== undefined) obj.rotation.y = tr.rot;

    // Troca de corpo ao mudar de forma.
    const form = world.get(id, C.Form);
    if (form) {
      const kind = FORMS[form.current].mesh;
      if (kind !== r.kind) {
        obj.remove(r.body);
        r.body = buildMesh(kind);
        obj.add(r.body);
        r.kind = kind;
      }
      if (form.swapFlash > 0) {
        const s = 1 + form.swapFlash * 0.6;
        r.body.scale.setScalar(s);
      } else {
        r.body.scale.setScalar(1);
      }
    }

    // Flash de dano tem prioridade; senão, aura de status (queimando/congelado/
    // envenenado/enraizado) tinge o corpo por emissão. Ambos via Tint._wasLit
    // para sabermos quando voltar ao normal.
    const tint = world.get(id, C.Tint);
    if (tint) {
      if (tint.flash > 0) {
        applyEmissive(obj, 0xff3030, Math.min(1, tint.flash * 6));
        tint.flash -= 1 / 60;
        tint._wasLit = true;
      } else {
        const st = world.get(id, C.StatusEffects);
        const aura = st ? statusAura(st) : null;
        if (aura) {
          const pulse = 0.5 + 0.3 * Math.sin(t * 9 + id);
          applyEmissive(obj, aura, pulse);
          tint._wasLit = true;
        } else if (tint._wasLit) {
          applyEmissive(obj, 0x000000, 0);
          tint._wasLit = false;
        }
      }
    }

    // Recuo ao tomar dano (flinch): decai o timer do Tint.
    let react = 0;
    if (tint && tint.react > 0) {
      react = Math.min(1, tint.react / 0.18);
      tint.react = Math.max(0, tint.react - adt);
    }

    // Jogador caído deita e fica translúcido.
    const pc = world.get(id, C.PlayerControlled);
    if (pc) {
      obj.rotation.z = pc.downed ? Math.PI / 2.2 : 0;
    }

    // Animação de morte: o corpo tomba e afunda antes de ser destruído (ver
    // combat.killEntity). Sobrepõe a animação normal.
    if (r.dying !== undefined) {
      r.dying += adt;
      const k = Math.min(1, r.dying / 0.45);
      obj.rotation.z = k * (Math.PI / 2);
      obj.position.y = y - k * 0.25;
      const s = 1 - k * 0.25;
      obj.scale.setScalar(s);
      continue;
    }

    // Animação procedural das partes (corpo da forma p/ jogador; o próprio
    // object3d para inimigos). Anima por velocidade, ataque e recuo.
    const anim = r.body?.userData?.parts ? r.body : (obj.userData?.parts ? obj : null);
    if (anim && !pc?.downed) {
      const vel = world.get(id, C.Velocity);
      const sp = vel ? Math.hypot(vel.vx, vel.vz) : 0;
      let attack = 0;
      if (pc && form) {
        const cd = FORMS[form.current].attackCooldown || 1;
        attack = Math.max(0, Math.min(1, (pc.attackTimer ?? 0) / cd));
      } else {
        const ai = world.get(id, C.AI);
        if (ai?.swing) attack = Math.min(1, ai.swing / 0.25); // investida do inimigo
      }
      animateBody(anim, adt, {
        moving: sp > 0.4, speed: sp, attack, react, gait: anim.userData.gait,
        gesture: r.idleGesture ?? null, gestureSeed: id,
        // Golpe variado por swing + escalando com o combo (E60). Inimigos não
        // têm swingIndex/combo → caem na pose padrão (estocada).
        attackKind: pc?.swingIndex ?? 0, combo: pc?.combo ?? 0,
      });
    }
  }
}

/** Cor de emissão por status dominante (mesma paleta da VFX). */
function statusAura(st) {
  if (st.burn > 0) return 0xff5a1a;
  if (st.freeze > 0) return 0x4aa6ff;
  if (st.poison > 0) return 0x6fd04a;
  if (st.root > 0) return 0x4a7a30;
  return null;
}

function applyEmissive(obj, color, intensity) {
  obj.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive) {
      // Clone-on-write: os materiais voxel são COMPARTILHADOS por cor (cache em
      // voxelModels), então mexer no emissive de um vazava para TODOS os modelos
      // daquela cor — o bug do "a calça pisca em todo mundo" ao acertar um único
      // inimigo (E59). Cada malha que chega a piscar/tingir ganha sua própria
      // cópia na 1ª vez; cenário estático nunca pisca, então nunca clona.
      if (!o.userData._ownMat) {
        o.material = o.material.clone();
        o.userData._ownMat = true;
      }
      o.material.emissive.setHex(color);
      o.material.emissiveIntensity = intensity;
    }
  });
}
