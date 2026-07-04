# ADR 0071 — HUD no layout MCD: orbe de vida e slots (M15.5)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Playtest 3: "a UI ainda não tá com layout do MCD". O painel do jogador era
um cartão retangular com barras horizontais — funcional, mas vocabulário de
formulário, não de ARPG.

## Decisão
Cluster por jogador no vocabulário do Minecraft Dungeons (`Hud.ts`):
- **Orbe de vida circular** (preenchimento vertical, borda na cor de
  identidade do jogador) com o **ícone da forma atual** no centro — a
  informação de "quem sou e como estou" num só olhar.
- **Coluna de Seiva** fina ao lado do orbe (preenchimento vertical).
- **Slots quadrados de artefato** (37px, cooldown como cortina que desce) —
  a leitura clássica de hotbar.
- **Chromeless**: sem cartão de fundo — os elementos flutuam sobre o mundo
  com sombra, como no MCD. Nome/forma em texto pequeno acima.
- Coop: um cluster por jogador, lado a lado como antes.

## Consequências
- Mobile herda tudo (os slots continuam escondidos no touch — ADR 0068).
- O e2e não assertava o DOM do painel (só screenshots) — sem quebra.
- Inventário/mercador em grade de slots ficam no M15.6.
