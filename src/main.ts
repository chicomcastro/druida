/**
 * Druida — bootstrap.
 * Cria o Game e mostra o menu principal. "Novo jogo" começa do zero;
 * "Continuar" carrega o save (IndexedDB). O loop só inicia após a escolha.
 * Jogadores 2–4 entram apertando START no gamepad (coop same-screen).
 */
import '@fontsource/cinzel/700.css'; // fonte de títulos (OFL, empacotada)
import { Game } from './core/Game.js';
import { apply, loadFromStorage, setupAutosave } from './gameplay/save.js';
import { preloadModels } from './entities/modelLoader.js';
import { C } from './core/ecs/components.js';
import { SimPlayer, SimMetrics, installSyntheticInput } from './gameplay/simulator.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

async function begin(loadSave) {
  await preloadModels(); // usa .glb se registrados; senão segue com voxels
  game.spawnInitialPlayers();
  if (loadSave) {
    const data = await loadFromStorage();
    if (data) apply(game, data);
  }
  game.emit('objective', { text: game.story.objective() });
  game.emit('biomeChanged', { biome: 'clareira', def: { name: game.currentBiomeName() } });
  game.tutorial.intro();
  setupAutosave(game);
  game.start();
}

game.menus.showMain(
  () => begin(false),
  () => begin(true),
);

// Exposto para depuração no console.
(window as any).DRUIDA = game;

// Rastreador de XP LIGADO por padrão (E64, temporário): a cada ganho de XP
// aparece um toast com a fonte (`🔎 +N XP · espécie`), para caçar o "sobe de
// nível sem inimigo" no celular sem depender do console. Desligável tocando 3×
// no "Nível" (ou `DRUIDA.debugXp = false`). Remover quando o caso fechar.
(game as any).debugXp = true;

// Simulador sintético (E40): no console, `DRUIDA.sim.drive()` acopla o
// jogador-robô ao P1 e o jogo passa a se jogar sozinho (coletando métricas);
// `DRUIDA.sim.metrics.report()` mostra o balanceamento; a função devolvida por
// `drive()` restaura o controle humano.
(window as any).DRUIDA.sim = {
  SimPlayer, SimMetrics, installSyntheticInput,
  metrics: null as any,
  drive(opts: any = {}) {
    const p1 = [...game.world.query(C.PlayerControlled, C.Transform)][0];
    if (!p1) { console.warn('[sim] entre no jogo primeiro'); return () => {}; }
    const pid = p1[0] as number;
    this.metrics = new SimMetrics().attach(game, pid);
    const off = installSyntheticInput(game, pid, opts);
    console.log('[sim] jogador-robô no controle — DRUIDA.sim.metrics.report()');
    return off;
  },
};
