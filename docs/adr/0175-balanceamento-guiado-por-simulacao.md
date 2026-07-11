# ADR 0175 — Passada de balanceamento guiada pelo simulador (E42)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
A matriz de simulação (E41/ADR 0174) mostrou, com dados, que o jogo estava **fácil
demais**: no piso (bot `melee` sem esquiva, nível 1) **1 inimigo comum deixava ~90%
de vida** (todos "fácil") e **3 juntos eram só "médio"**. O design pediu o oposto:
matar 1 comum deve **dar trabalho**, **3 juntos** devem ser **difíceis**, e devem
**existir inimigos duros** — com a média em "médio".

## Decisão
Ajuste guiado por varredura (`runMatrix`), usando o **melee-sem-esquiva como piso**
e conferindo que os estilos de esquiva/kite (o "teto") não ficassem injustos:

1. **Fatores globais de dificuldade** em `scaleEnemy` (`gameplay/spawn.ts`) +
   `data/balance.ts`:
   - `enemy.hpBase 1.0 → 1.4` — inimigos duram mais (mais janelas de dano; packs
     viram guerra de atrito).
   - `enemy.damageBase 1.0 → 1.9` (nova alavanca; multiplica o dano no `scaleEnemy`)
     — encarar passa a custar.
   - `player.baseHp 130 → 118` — corte leve para o combate custar algo.
2. **Espectro de Cinza (`ashwraith`)** — era **incatchável** (speed 3.2 > herói 3)
   e stun-lockava (0.5): o piso morria sem causar dano. Nerf leve (**speed 2.9**,
   **stun 0.4**) o mantém como **"dodge-check"** — fatal para quem encara de frente,
   mas vencido com folga por quem **esquiva** o telégrafo ou **kita**. É intencional:
   um inimigo que cobra a mecânica (o design pediu inimigos duros).

Resultado medido (piso melee, nível 1): **1 comum 90%→78%** (fácil/médio, "dá
trabalho") e **3 comuns 65%→26%** (difícil/brutal). Os inimigos mais duros
(husk/xamã em trio, Espectro) ficam letais **no pior caso** — venceríveis com
esquiva/kite/skills. Detalhe em `docs/balance-report.md`.

## Consequências
- O ritmo agora bate com o pedido: nada trivial, packs perigosos, inimigos duros
  que cobram mecânica. As alavancas são globais (2 números), fáceis de reafinar.
- **Canary de regressão** (`tests/simBalance.test.ts`): trava as faixas — 1 comum
  não-trivial (vida < 90%) e não massacrado (> 45%); 3× muito mais duros (delta
  > 20 pts, vida < 55%); Espectro fatal p/ quem não esquiva mas vencido por
  esquiva/kite. Um tuning futuro que quebre isso falha no CI.
- 395 testes verdes, `tsc` limpo, `vite build` ok. (`enemies-e8.test` atualizado
  para o novo stun do Espectro.)

## Futuro
Medir `caster`/formas a fundo; afinar a curva por nível/equipamento com a mesma
matriz (`hpPerLevel`/`damagePerLevel`); calibrar a IA de esquiva do bot (hoje
esquiva demais — mede o "jogador perfeito", não o médio).
