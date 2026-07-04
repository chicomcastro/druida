# ADR 0062 — Texturas pixel-art procedurais (spike M14.1 do estilo MCD)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Pivot de direção de arte para o estilo Minecraft Dungeons
([análise completa](../art-direction-mcd.md)). A assinatura mais barata e de
maior impacto é a **textura pixel-art 16×16 com pixel duro** em tudo que hoje
é cor chapada. Este é o spike de validação (M14.1): se o look convencer,
as próximas fases (chão de blocos, elevação, luz dramática) constroem em cima.

## Decisão
- **`core/render/pixelTextures.ts`**: 8 tipos (grass, dirt, stone, planks,
  log, leaves, thatch, snow) gerados por `CanvasTexture` 16×16 com RNG
  determinístico (mulberry32) — zero assets, zero bundle, CSP/offline
  intactos (mesma filosofia do ruído de chão que este ADR aposenta).
- **Luminância tintável**: as texturas são tons de cinza multiplicados pelo
  `material.color`/`instanceColor` — todo o sistema de recolorir por
  bioma/pureza (ADRs 0042/0044) continua funcionando sem mudança.
- **Filtros**: `magFilter: Nearest` (pixel duro de perto) +
  `minFilter: NearestMipmapLinear` (sem cintilado a distância).
- **Régua do estilo**: ~16px por unidade de mundo. O chão usa 1 textura por
  unidade (repeat 600×600 no plano) com moldura de 1px escura — a grade de
  "blocos" do MCD. Superfícies grandes usam `tiledPixelTexture(kind, rx, ry)`
  (clones com repeat próprio, cacheados; mesma imagem na GPU).
- **Aplicado em**: chão (tipo por bioma via `groundTex` — grama/terra/neve/
  pedra), pools instanciados (tronco=log, copa/pinheiro=leaves, rocha=stone),
  Carvalho-Mãe, e construções das vilas (paredes=planks, telhado=thatch,
  fundação=stone, toras=log).

## Consequências
- O mundo inteiro ganha leitura "Minecraft" imediata; capturas da clareira e
  de Cinzafolha validam o look antes das fases caras do M14.
- 8 canvases 16×16 na GPU (~2 KB de VRAM) + clones de repeat; custo ~zero.
- Headless-safe (devolve `null` sem `document`) — suíte node intacta,
  coberto por teste.
- O `Renderer.groundTexture()` (ruído de blobs) fica obsoleto — remoção fica
  para a fase M14.2 (chão de blocos), que mexe nesse código de novo.
