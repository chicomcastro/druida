import { C, Factions } from '../core/ecs/components.js';
import { weightedPick } from '../utils/math.js';
import { biomeAt } from '../world/WorldManager.js';
import { BIOMES } from '../data/biomes.js';
import { BALANCE } from '../data/balance.js';

/**
 * Mantém uma população de inimigos perto dos jogadores, sorteada da tabela do
 * bioma local, escalando com o número de jogadores. Não spawna no hub (zona
 * segura) nem dentro do campo de visão imediato.
 */
const HUB_SAFE_RADIUS = 16;

export function spawnerSystem(game, dt) {
  const { world } = game;
  game._spawnTimer = (game._spawnTimer ?? 0) - dt;

  const players = [...world.query(C.Transform, C.PlayerControlled, C.Health)]
    .filter(([, pc, , hp]) => !pc.downed && !hp.dead);
  if (players.length === 0) return;

  const playerCount = [...world.query(C.PlayerControlled)].length;
  const s = BALANCE.spawn;
  const cap = Math.round((s.capBase + game.progress.level * s.capPerLevel) * (s.capPlayerBase + playerCount * s.capPerPlayer));

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

  const biome = BIOMES[biomeAt(x, z)];
  if (!biome?.enemies?.length) return;
  const pick = weightedPick(biome.enemies, Math.random);
  game.spawnEnemyByKey(pick.key, x, z);
}
