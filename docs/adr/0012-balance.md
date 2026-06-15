# ADR 0012 — Balanceamento centralizado

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Os "números mágicos" de progressão, combate, spawn e escala estavam espalhados
por vários sistemas, dificultando o ajuste fino e o playtest.

## Decisão
Centralizar os tunáveis em `src/data/balance.js` (`BALANCE`), agrupados por
domínio (player, progression, enemy, spawn, loot). Os sistemas passam a ler
desse módulo em vez de constantes locais.

Ajustes do primeiro passe (sem playtest formal, valores conservadores):
- Vida base do jogador 120 → **130**; regen de Seiva 14 → **15**; Seiva inicial
  40% → **50%** (curva de poder inicial menos punitiva).
- XP base 40 → **38** (nivelar levemente mais rápido no começo).
- Drop base 0.28 → **0.30**; essência 1–3 → **1–4**.
- Escala de inimigos por nível suavizada (hp 0.18 → 0.16; dano 0.08 → 0.07).

## Consequências
- Iterar balanceamento é editar um arquivo só.
- Valores ainda carecem de validação por playtest (item de backlog M9/M10).
