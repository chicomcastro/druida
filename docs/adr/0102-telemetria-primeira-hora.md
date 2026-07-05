# ADR 0102 — Economia & primeira hora: telemetria do funil (E9)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O E9 é um épico de **tuning contínuo** (curva de XP, drops, preços por tier,
onboarding), fechado pelo **Gate F** — o playtest da primeira hora inteira. O
tuning em si depende de dados de playtest reais (não há como calibrar "no
escuro"). O que dá para adiantar de forma autônoma é **instrumentar** o jogo
para que esse playtest produza dados acionáveis, sustentando o pilar "evoluir
comprando".

## Decisão
- **Telemetria expandida** (`telemetry.ts`, v2), reusando a infra local/opt-out
  do ADR 0051 (nada sai da máquina; export manual na pausa). Novos contadores
  do funil de economia/progressão:
  - `essenceSpent`, `itemsBought` — o quanto o jogador realmente **compra**
    (pilar central); pareados com `essenceEarned`.
  - `levelUps`, `maxLevel` — ritmo da progressão.
  - `villagesVisited` (distintas), `interiorsEntered`, `rests`,
    `sideQuestsStarted`, `loreFound` — engajamento com o mundo vivo (E5–E8).
  - **Marcos da 1ª hora**: `firstKillAt`, `firstLevelAt`, `firstPurchaseAt`,
    `firstDownAt`, `firstQuestAt` — o SEGUNDO de jogo de cada primeira
    ocorrência (funil de ativação: quanto tempo até matar, subir de nível,
    comprar, morrer, completar uma quest).
- **Evento `purchase`**: o botão de compra da loja passa a emitir
  `{ price, item }`, capturado pela telemetria (antes não havia sinal de
  gasto). `levelUp`/`settlementEntered`/`interiorEntered`/`rested`/
  `sideQuestStarted`/`loreFound` já existiam e agora alimentam o funil.
- Migração transparente: `{ ...EMPTY(), ...stored }` preenche os campos novos
  em saves antigos; `v` vai a 2.

## Consequências
- O playtest da primeira hora (Gate F) passa a gerar um **funil exportável**:
  dá para ver onde o jogador trava, se compra (ou só acumula essência), e o
  tempo até cada marco — exatamente os dados que o tuning de curva/preços/drops
  precisa.
- O **tuning numérico** de XP/drops/preços permanece pendente do Gate F: é
  ajuste guiado por dados, feito com o usuário após o playtest. Este ADR
  entrega o instrumento, não os valores finais.
- Contadores novos são baratos (inteiros agregados) e opt-out como o resto.
