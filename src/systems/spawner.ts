import { C, Factions } from '../core/ecs/components.js';
import { weightedPick } from '../utils/math.js';
import { biomeAt } from '../world/WorldManager.js';
import { BIOMES, BIOME_ORDER } from '../data/biomes.js';
import { BALANCE } from '../data/balance.js';
import { spawnPack, pickPack, promoteToElite } from '../gameplay/spawn.js';
import { ELITE_AFFIXES } from '../data/enemies.js';

/**
 * Mantém uma população de inimigos perto dos jogadores, sorteada da tabela do
 * bioma local, escalando com o número de jogadores. Não spawna no hub nem
 * dentro dos assentamentos (zonas seguras — ADR 0041), nem no campo de visão
 * imediato.
 */
const HUB_SAFE_RADIUS = 16;

export function spawnerSystem(game, dt) {
  if (game.inDungeon) return; // ondas controladas pela masmorra
  const { world } = game;
  game._spawnTimer = (game._spawnTimer ?? 0) - dt;

  const players = [...world.query(C.Transform, C.PlayerControlled, C.Health)]
    .filter(([, pc, , hp]) => !pc.downed && !hp.dead);
  if (players.length === 0) return;

  const playerCount = [...world.query(C.PlayerControlled)].length;
  const s = BALANCE.spawn;
  // À noite a floresta fica mais perigosa (ADR 0049).
  const nightMul = 1 + (game.dayNight?.nightAmount?.() ?? 0) * BALANCE.dayNight.nightSpawnBonus;
  const cap = Math.round((s.capBase + game.progress.level * s.capPerLevel) * (s.capPlayerBase + playerCount * s.capPerPlayer) * nightMul);

  let enemyCount = 0;
  for (const [, fac] of world.query(C.Faction)) if (fac.team === Factions.ENEMY) enemyCount++;
  if (enemyCount >= cap || game._spawnTimer > 0) return;
  game._spawnTimer = Math.max(s.intervalMin, s.intervalMax - game.progress.level * s.intervalPerLevel);

  // Escolhe um jogador e um ponto fora da zona segura/hub.
  const [, , anchor] = players[Math.floor(Math.random() * players.length)];
  const a = Math.random() * Math.PI * 2;
  const rad = 18 + Math.random() * 8;
  const x = anchor.x + Math.sin(a) * rad;
  const z = anchor.z + Math.cos(a) * rad;
  if (Math.hypot(x, z) < HUB_SAFE_RADIUS) return;
  if (game.settlements?.isSafe(x, z, 6)) return;

  const biomeKey = biomeAt(x, z);
  const biome = BIOMES[biomeKey];
  if (!biome?.enemies?.length) return;

  // Encontros compostos: chance de spawnar um pack autoral do bioma em vez de
  // um inimigo avulso (com folga de +2 sobre o cap). Ver ADR 0045.
  const s2 = BALANCE.encounters;
  const pack = pickPack(biome, Math.random);
  if (pack && Math.random() < s2.packChance && enemyCount + pack.comp.length <= cap + 2) {
    const ids = spawnPack(game, pack.comp, x, z);
    // O "líder" do pack pode ser elite (mais provável em anéis avançados).
    if (ids.length && Math.random() < eliteChance(biomeKey) * 2) {
      promoteToElite(game, ids[0], randomAffix());
    }
    return;
  }

  const pick = weightedPick(biome.enemies, Math.random);
  const id = game.spawnEnemyByKey(pick.key, x, z);
  if (id && Math.random() < eliteChance(biomeKey)) promoteToElite(game, id, randomAffix());
}

/** Chance de elite cresce com o anel (quase nula na Clareira inicial). */
function eliteChance(biomeKey) {
  const ring = Math.max(0, BIOME_ORDER.indexOf(biomeKey));
  const e = BALANCE.encounters;
  return ring === 0 ? e.eliteChanceBase : e.eliteChanceBase + ring * e.eliteChancePerRing;
}

function randomAffix() {
  const keys = Object.keys(ELITE_AFFIXES);
  return keys[Math.floor(Math.random() * keys.length)];
}
