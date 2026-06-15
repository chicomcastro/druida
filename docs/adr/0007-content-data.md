# ADR 0007 — Conteúdo data-driven (inimigos/biomas)

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Variedade de inimigos e biomas precisa crescer sem tocar em sistemas.

## Decisão
Conteúdo em módulos de dados (`src/data/`):
- `enemies.js` — stats + `behavior` (melee/ranged/exploder/summoner) + loot/xp.
- `biomes.js` — clima (cor, fog), densidade de props e tabela ponderada de
  inimigos por bioma.

A IA (`aiSystem`) interpreta `behavior`; o spawner sorteia inimigos da tabela
do bioma local. Adicionar um inimigo/bioma é editar dados, não código.

## Consequências
- Designers (ou o próprio autor) ajustam o jogo editando JS de dados.
- `behavior` novos exigem um ramo no `aiSystem` — fronteira aceitável.
