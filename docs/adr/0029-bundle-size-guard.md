# ADR 0029 — Guarda de tamanho de bundle no CI

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Sendo um jogo web, o tamanho do bundle impacta o tempo de carregamento. Sem um
limite, dependências/código pesados poderiam crescer despercebidos entre
iterações.

## Decisão
- `size-limit` + `@size-limit/file` com `.size-limit.json` apontando para
  `dist/assets/*.js`, orçamento **185 kB** (medição em brotli; atual ~130 kB,
  com folga para crescimento mas pegando regressões grandes).
- Script `npm run size`; o CI roda após o `build` e **falha se exceder**.
- Badges de CI/E2E adicionados ao README.

## Consequências
- Regressões de tamanho são barradas no PR.
- O orçamento deve ser revisado conscientemente (ex.: ao adicionar libs ou
  assets reais); subir o limite é uma decisão explícita no `.size-limit.json`.
- size-limit mede brotli por padrão (≈ o que o servidor entrega); o número
  difere do "gzip" reportado pelo Vite.
