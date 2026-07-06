# ADR 0108 — Reputação por vila

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Com a rixa das famílias em todas as vilas (ADR 0107), faltava a **recompensa
mecânica** que o usuário pediu ao escolher "expandir a rixa": *reputação por
vila*. Sem ela, resolver a rixa dava só essência + diálogo; queríamos amarrar o
conteúdo social ao pilar "evoluir comprando".

## Decisão
Sistema leve de reputação por assentamento (`src/gameplay/reputation.ts`):

- **Estado**: `game.reputation: Record<settlementId, número>` (inicia vazio).
- **Ganho** (hook em `questCompleted`, mapa `REP_BY_QUEST`): reconciliar a rixa
  vale **+2**; concluir a missão do ancião (ADR 0047) vale **+1**. Cobre as 4
  vilas (a Clareira só tem a rixa).
- **Efeito — desconto em degraus**: reputação ≥2 → **5%**, ≥4 → **10%** de
  desconto nas compras **daquela vila**. Aplicado em `rerollShop`; a vila da
  loja ativa é resolvida por `shopSettlement(key)` — mercador regional usa o id
  do assentamento; lojas-família mapeiam pela família do tema; mercado geral e
  taverna são neutros (sem desconto).
- **Persistência**: `reputation` no save (`SaveV1`); `questCompleted` já é
  gatilho de autosave.
- **UI**: estrelas (★) ao lado do nome da vila no mapa-mundi, conforme a
  reputação.

## Consequências
- Resolver as rixas passa a ter retorno tangível e recorrente (comprar mais
  barato onde você é benquisto), reforçando o loop social→econômico.
- Fecha o E11 (rixa + reputação nas vilas 2–4); a lacuna da wiki some por
  completo.
- Números (degraus 2/4, 5%/10%, +1/+2) ficam em `reputation.ts` para tunar no
  Gate F junto com o resto da economia.
