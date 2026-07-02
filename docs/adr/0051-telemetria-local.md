# ADR 0051 — Telemetria leve local + notas de balanceamento

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
Fechando o pacote Encanto & Engajamento (M11): todos os números de jogo são
chutes educados — nunca medidos com jogadores. O backlog M10 pedia
"telemetria leve opcional" e "playtest + feedback", mas sem qualquer coleta
não há o que analisar; ao mesmo tempo, telemetria em rede seria overkill (e
uma questão de privacidade) para um jogo estático no GitHub Pages.

## Decisão
- **`gameplay/telemetry.ts` — contadores 100% locais**: kills (com recortes
  de elite/chefe), quedas/wipes, dano dado/tomado, essência, itens, missões,
  dons, passo máximo da história, vitórias, sessões e tempo de jogo. Persistem
  no `localStorage` (flush a cada ~10s) e **nada sai da máquina** — o jogador
  exporta manualmente ("📋 Copiar dados de jogo" na pausa, JSON legível) para
  compartilhar num playtest se quiser. Privacidade por construção: não há
  código de rede.
- **Desligável** no menu de pausa (padrão: ligada, por ser local); desligada,
  nenhum contador avança.
- **`docs/balance-notes.md`**: registra a *intenção* por trás dos números do
  `BALANCE` (TTK, economia, chances de elite/pack, bônus noturno), as
  **métricas-alvo** que os contadores permitem verificar (curva de morte,
  ritmo de campanha, razão dano dado/tomado) e as alavancas rápidas de ajuste.
  Balanceamento fino de verdade fica intencionalmente para depois do playtest
  — mexer nos números sem medição seria trocar um chute por outro.

## Consequências
- O próximo playtest tem instrumentação e um roteiro do que olhar; o custo é
  ~zero (listeners no event bus existente + um objeto no localStorage).
- Contadores são agregados por instalação (não por save/run) — suficiente
  para tendências; recortes por run ficam como evolução se necessário.
- Encerra o M11: os oito itens do pacote estão entregues (ADRs 0044–0051).
