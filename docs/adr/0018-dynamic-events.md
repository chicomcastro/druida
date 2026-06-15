# ADR 0018 — Eventos dinâmicos por região

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Faltava variedade e surpresa durante a exploração entre os marcos da campanha e
os acampamentos fixos.

## Decisão
`EventManager` dispara eventos periódicos (a cada ~80–140s, fora do hub e com
jogadores vivos) perto do grupo, anunciados no HUD:
- **Surto de Corrupção**: pico de inimigos do bioma local ao redor do grupo —
  intensidade e pressão momentâneas.
- **Espírito do Tesouro**: criatura veloz e esquiva (`Bounty`) que, ao ser
  abatida, solta **loot garantido + essência** acima do normal — recompensa a
  perseguição.

Reaproveita spawner, IA, loot e o tag `Bounty` (loot extra no `kill`).

## Consequências
- Exploração ganha ritmo e momentos memoráveis sem conteúdo autoral pesado.
- Frequência/efeitos são tunáveis; eventos mais elaborados (chuva, mini-chefes
  itinerantes) podem ser adicionados ao registro depois.
