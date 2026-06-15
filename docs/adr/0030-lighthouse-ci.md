# ADR 0030 — Lighthouse CI (orçamento de performance web)

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Sendo um jogo web, métricas de carregamento (peso, performance) importam e devem
ser acompanhadas a cada iteração — complementando a guarda de tamanho de bundle
(ADR 0029) com uma visão de runtime/carregamento.

## Decisão
- Workflow `lighthouse.yml` (em PR): faz `build` e roda **Lighthouse CI**
  (`treosh/lighthouse-ci-action`) servindo o `dist` (`staticDistDir`).
- Mede a **tela de menu** (estado inicial), que é representativa do load — o
  loop de render só inicia após "Novo jogo", então a página inicial é leve e
  estável para o Lighthouse.
- Assertions em **`warn`** (performance ≥ 0.8, peso total, bytes de script,
  compressão) — acompanha a tendência **sem bloquear** o merge; o gate rígido de
  tamanho continua sendo o `size-limit`.
- Relatório publicado em `temporary-public-storage` (link nos logs) + artifact.

## Consequências
- Tendência de performance/peso visível por PR.
- `preset: desktop` (jogo é orientado a desktop). Endurecer para `error` em
  métricas específicas é uma decisão futura, se quisermos um gate de perf.
