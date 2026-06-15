import { C } from '../core/ecs/components.js';
import { makeRng } from '../utils/math.js';
import { biomeAt } from './WorldManager.js';
import { BIOMES } from '../data/biomes.js';
import { weightedPick } from '../utils/math.js';
import { createEnemy, createLootOrb } from '../entities/factories.js';
import { generateItem } from '../gameplay/loot.js';

/**
 * Eventos dinâmicos por região: periodicamente (fora do hub) dispara um evento
 * perto do grupo — Surto de Corrupção (pico de inimigos) ou Espírito do Tesouro
 * (criatura fujona com loot garantido). Anunciados no HUD. Ver ADR 0018.
 */
const HUB_SAFE = 18;

export class EventManager {
  game: any;
  rng: any;
  timer: number;

  constructor(game) {
    this.game = game;
    this.rng = makeRng((game.seed ^ 0x51ed270b) >>> 0);
    this.timer = 60; // primeiro evento ~1min
    game.on('kill', (e) => this._onKill(e));
  }

  _onKill(e) {
    const bounty = this.game.world.get(e.id, C.Bounty);
    if (!bounty) return;
    // Espírito do Tesouro: loot extra ao abater.
    const lvl = this.game.regionLevel();
    for (let i = 0; i < bounty.items; i++) {
      createLootOrb(this.game.world, this.game.renderer, {
        x: e.x + (Math.random() - 0.5) * 2, z: e.z + (Math.random() - 0.5) * 2, item: generateItem(lvl + 1),
      });
    }
    createLootOrb(this.game.world, this.game.renderer, { x: e.x, z: e.z, item: { essence: 15 + lvl * 3, rarityColor: 0x9fe06a } });
    this.game.emit('objective', { text: 'Tesouro saqueado!' });
  }

  _activePlayers() {
    let n = 0;
    for (const [, pc, hp] of this.game.world.query(C.PlayerControlled, C.Health)) if (!pc.downed && !hp.dead) n++;
    return n;
  }

  update(dt) {
    if (this.game.inDungeon) return;
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    if (Math.hypot(c.x, c.z) < HUB_SAFE || this._activePlayers() === 0) return; // sem eventos no hub
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.rng.range(80, 140);
    if (this.rng.chance(0.55)) this._surge(c); else this._treasure(c);
  }

  _surge(c) {
    const { game } = this;
    const def = BIOMES[biomeAt(c.x, c.z)];
    if (!def?.enemies?.length) return;
    const count = 6 + Math.floor(game.progress.level / 2);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.rng();
      const r = 14 + this.rng() * 8;
      game.spawnEnemyByKey(weightedPick(def.enemies, Math.random).key, c.x + Math.sin(a) * r, c.z + Math.cos(a) * r);
    }
    game.emit('objective', { text: '⚠️ Surto de Corrupção!' });
    game.camera?.addShake(0.4);
  }

  _treasure(c) {
    const { game } = this;
    const a = this.rng() * Math.PI * 2;
    const x = c.x + Math.sin(a) * 16;
    const z = c.z + Math.cos(a) * 16;
    const def = {
      name: 'Espírito do Tesouro', mesh: 'fungling', behavior: 'ranged',
      hp: 60 + game.progress.level * 8, speed: 5.5, damage: 3, radius: 0.5,
      aggroRange: 22, attackRange: 12, attackCooldown: 2.2, projectileColor: 0xffe08a,
      xp: 30, loot: { dropChance: 0 },
    };
    const scaled = game._scaleEnemy(def);
    const id = createEnemy(game.world, game.renderer, scaled, { x, z });
    game.world.get(id, C.LootTable).xp = scaled.xp;
    game.world.add(id, C.Bounty, { items: 3 });
    // Brilho dourado.
    const r = game.world.get(id, C.Tint);
    if (r) r.defaultColor = 0xffe08a;
    game.emit('objective', { text: '✨ Espírito do Tesouro apareceu! Cace-o.' });
    game.emit('vfxRing', { x, z, radius: 4, color: 0xffe08a });
  }
}
