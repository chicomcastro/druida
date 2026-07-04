# ADR 0068 — UI mobile: sem teclado, sem sobreposição (M15.1)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Playtest 3 em celular (prints): dicas de atalhos de TECLADO renderizando por
cima dos botões de toque, minimapa gigante (45% da largura em pé), botões
U/I/O sobre o painel do jogador e diálogos colidindo com o aglomerado de
botões. O layout do HUD só tinha sido pensado para desktop/tablet paisagem.

## Decisão
- **Touch não vê dicas de teclado**: `#hud-hint` esconde quando
  `isTouchDevice()`; o `#hud-root` ganha classe `touch`.
- **Slots de artefato do painel escondem no touch**: os botões U/I/O na tela
  já mostram os artefatos — o painel volta a ser compacto (nome + barras),
  liberando o canto inferior esquerdo.
- **Minimapa 112px no touch** (era 168) — a tela é preciosa.
- **Media queries ≤620px** (`Hud.ts`): objetivo vira faixa full-width no
  topo, título de bioma desce, toast menor, diálogo/prompt sobem acima da
  zona de botões, painel do jogador em 78%.
- **Media queries ≤540px** (`TouchControls.ts`): aglomerado de botões mais
  compacto em pé, com o arco U/I/O reposicionado para não invadir o painel.

## Consequências
- Retrato e paisagem verificados em viewport de celular (390×730 e 844×390,
  touch emulado): zero sobreposições.
- As dicas do tutorial ainda citam teclas no touch — é copy, tratado no
  M15.4 (dicas contextuais por dispositivo).
