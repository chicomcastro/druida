# ADR 0151 — Aldeões conversam entre si (E22.5)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
Última peça da vila viva (E22): os moradores tinham rotina, família e casa, mas
se ignoravam. O Chico queria que **interagissem entre si** — trocando prosa ao se
cruzarem, dando a leitura de comunidade.

## Decisão
- **Lógica de conversa** (`src/gameplay/chatter.ts`, pura/testável): `shouldChat`
  (dois aldeões perto — `CHAT_RANGE` 2u —, acordados e fora do cooldown de
  `CHAT_COOLDOWN` 14s), `chatEligible` e `pickChatLine` (fala curta determinística
  por semente+dia, de `CHAT_LINES`).
- **`SettlementManager._maybeChat`**: um morador **parado** procura um vizinho
  parado e elegível; se acham, **viram-se um pro outro**, um solta a fala e ambos
  entram em cooldown (com uma pausa curta). Não quebra a rotina — só acontece
  quando já estão ociosos.
- **Balão flutuante** (`DamageNumbers`): novo handler `villagerChat` desenha a
  fala (💬) projetada do mundo pra tela, reusando o pool de texto flutuante.

## Consequências
- A vila ganha vida social: aldeões se cumprimentam e trocam smalltalk pelas ruas
  e no salão, fechando o épico **E22 — Vila viva** (rotina + famílias + casas +
  conversas).
- Verificado por teste (elegibilidade; conversa só perto/acordado/sem cooldown;
  fala determinística que varia por dia) e em runtime num Game real (dois vizinhos
  parados → balão "Passe bem!", viram-se um pro outro, cooldown aplicado).
