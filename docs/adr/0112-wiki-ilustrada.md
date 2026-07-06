# ADR 0112 — Wiki ilustrada (capturas do jogo)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
A wiki (`docs/wiki.md`, ADR 0105) era só texto. O usuário pediu **fotos para
ilustrar** modelos, inimigos, vilas e mapas — para validar direção artística e
iterar sobre o desenvolvimento estático.

## Decisão
- **Imagens versionadas** em `docs/img/`, capturadas do próprio jogo (fonte da
  verdade), embutidas na wiki:
  - **Formas** (§6): 5 modelos voxel (Druida/Lobo/Urso/Corvo/Sapo) da vitrine
    `showcase.html`.
  - **Inimigos & chefes** (§10): amostra de inimigos + 2 chefes, também da
    vitrine.
  - **Mundo** (§3): mapa-mundi orgânico.
  - **Vilas** (§4): Círculo do Carvalho visto de cima (anel ao redor da árvore).
- **Formato**: modelos como PNG (fundo escuro, ~60 KB); cenas como **JPEG q82**
  (~70–150 KB) para não inchar o repositório.
- **Pipeline de captura**: script Playwright headless (Chromium do ambiente)
  dirige a vitrine/o jogo e salva os quadros; reexecutável quando a arte mudar.

## Consequências
- A wiki passa a mostrar o estado visual real do jogo, não só descrever.
- As imagens podem ficar desatualizadas se a arte mudar — recapturar é barato
  (rodar o script). Idealmente, um passo futuro regenera a galeria no CI.
- Repositório cresce ~1 MB (12 imagens); aceitável para docs.
