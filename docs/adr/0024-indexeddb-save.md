# ADR 0024 — Save em IndexedDB (com fallback)

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
O save vivia em `localStorage` (síncrono, com limite de tamanho). Saves de mundo
aberto (fog, baú, camps, codex, jogadores) tendem a crescer; o backlog previa
migrar para IndexedDB.

## Decisão
- Nova camada `gameplay/storage.ts`: KV assíncrono sobre **IndexedDB**, com
  **fallback para localStorage** quando IDB indisponível (e espelhamento em
  localStorage por robustez).
- `save.ts` passa a expor `saveToStorage/loadFromStorage/hasSave/clearSave`
  **assíncronos** (serialize/apply continuam puros e síncronos).
- Ajustes nos chamadores: `begin()` no bootstrap vira async; o botão Salvar da
  pausa aguarda a gravação; o menu principal habilita "Continuar" após checar
  o save de forma assíncrona (botão começa desabilitado).

## Consequências
- Saves maiores sem o teto do localStorage; base para futuras features
  (múltiplos slots, perfis).
- Funciona em ambientes sem IDB (fallback), mantendo compatibilidade.
