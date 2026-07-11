# ADR 0174 — Perfis de jogo no bot + matriz de simulação (E41)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
O simulador (E40/ADR 0173) provou o conceito com um robô **melee puro** — e já
achou um outlier (o Espectro de Cinza mata o melee-sem-esquiva). Mas balancear
"de verdade" exige medir **cada forma de jogar** (melee, esquiva, à distância,
skills) em **cada cenário** (1 vs 3 inimigos, por nível/equipamento), não um só.

## Decisão
1. **Estilos de jogo no `SimPlayer`** (`gameplay/simulator.ts`): `melee` (puro,
   pior caso), `melee_dodge` (esquiva o golpe **telegrafado** — rola para trás
   quando o inimigo entra em `windup`, ganhando i-frames), `ranged` (mantém
   distância/kite e ataca à distância) e `caster` (kite + dispara o artefato).
   O golpe segue o combo por timing (ADR 0092) em todos.
2. **Fix de atribuição de métricas** (`SimMetrics`): projéteis aplicam dano com
   `attackerId` = a entidade do projétil, então casar só por `attackerId` perdia
   o dano ranged. Passou a contar, numa **sim solo**, todo dano/abate num inimigo
   (`Faction === ENEMY`) como do jogador — melee, projétil, AoE e DoT entram.
3. **Matriz de simulação** (`gameplay/simMatrix.ts`): `runScenario` e `runMatrix`
   varrem **estilo × inimigo × quantidade × nível**, equipando a arma do estilo
   no tier do nível (`equipForStyle`) e criando packs (`spawnPack`). Cada célula
   devolve TTK, DPS, dano sofrido, sobrevivência, vida restante e um **rótulo de
   dificuldade** (`rateDifficulty`: trivial→letal). Desacoplado do harness: recebe
   uma fábrica `spawnGame()`, então `src/` não importa `tests/`.

## Consequências
- Dá para medir o jogo por estilo. A primeira varredura já mostra o mapa: o
  **melee-sem-esquiva é o piso** (1 rotboar ~93% de vida = fácil demais; o
  Espectro é **letal**); **esquiva e ranged são o teto** (tomam ~0 de dano). Isso
  define os alvos do E42: subir o piso (1 comum deve custar mais; 3 juntos, difícil)
  sem tornar injusto o teto, e decidir o tuning do Espectro.
- Travado por testes (`simMatrix.test`: classificação de dificuldade; arma por
  estilo; `runScenario` devolve métricas+nota; **esquivar reduz o dano** vs. um
  inimigo que telegrafa; **ranged limpa sem tomar dano e com DPS atribuído**
  (fix do projétil); `runMatrix` gera uma linha por combinação e 3 inimigos
  custam mais que 1). 392 testes verdes, `tsc` limpo, `vite build` ok.

## Futuro
Estilo `caster`/formas com skills medidos a fundo; ajustar a IA de esquiva do bot
(hoje ela esquiva demais e demora a matar — é o "jogador perfeito"); usar a matriz
na passada de balanceamento (E42) e como **canary de ritmo** no CI.
