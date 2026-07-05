# ADR 0084 — Vilas com estrutura e conteúdo: assinaturas e props de rua (M19.3)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Playtest 6: "as vilas seguintes ainda estão pequenas, precisamos investir
nelas para terem estrutura e conteúdo pra ser explorado".

## Decisão
- **Estrutura-assinatura por vila** (identidade explorável):
  - **Cinzafolha**: torre de vigia de 7u — 4 pernas de tora, plataforma
    com guarda-corpo, telhado em degraus, escada e farol aceso no LightPool.
  - **Vau**: píer de pesca avançando 10u sobre a lagoa, com postes,
    lanterna na ponta e segundo barco balançando na água.
  - **Degelo**: muro quebra-vento de blocos de gelo (emissivos) protegendo
    o abrigo da nevasca do norte.
- **+1 construção por vila**: 5ª palafita a noroeste (com passarela em L),
  5ª tenda guardando a trilha dos cairns (com trilha ligada).
- **Props de rua** (helpers reutilizáveis): `_barrel` (barril com cintas),
  `_woodpile` (pilha de toras 2+1), `_clothesline` (varal com panos que
  balançam no vento) — espalhados por hub, Vau, Cinzafolha e Degelo.

## Consequências
- Cada vila tem um marco próprio que se vê de longe e recompensa a visita.
- Teste de água do Vau atualizado (2 superfícies: lagoa + barco do píer).
- Fecha o M19 (3/3).
