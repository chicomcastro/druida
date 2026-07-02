# ADR 0042 — Atmosfera visual: luz por bioma, sol móvel e partículas ambientais

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
A cena usava uma única iluminação global, chão de cor chapada e nenhum
elemento atmosférico: os biomas mudavam só a cor do fundo/névoa. As sombras
existiam apenas perto da origem (a shadow camera do sol era fixa), então o
resto do mundo — incluindo as novas cidades (ADR 0041) — ficava plano e sem
profundidade.

## Decisão
Melhorias de realismo/imersão baratas (sem pós-processamento), mantendo a
direção low-poly:

- **Tone mapping ACES** (`ACESFilmicToneMapping`, exposure 1.15): highlights
  e cores emissivas (lanternas, cristais, chamas) deixam de estourar.
- **Iluminação por bioma**: cada bioma define `light` (cor/intensidade do sol
  e do hemisfério) aplicado pelo `setBiomeMood` — a Clareira é dourada, o
  Pântano é esverdeado e abafado, o Bosque Cinza é dessaturado, os Picos são
  frios e estourados de luz, o Coração é púrpura e opressivo.
- **Sol segue o grupo**: a DirectionalLight (e o alvo da shadow camera)
  acompanha o `groupCenter` a cada frame — sombras corretas em qualquer ponto
  do mundo, com o mesmo mapa de sombra de 2048².
- **Chão com ruído**: textura procedural de manchas (CanvasTexture repetida)
  multiplicada pela cor do bioma quebra o "verde chapado". Gerada no
  Renderer (camada de view); em ambiente headless retorna `null` e o material
  segue sem mapa (testes intactos).
- **Vegetação rasteira instanciada**: um pool novo de `InstancedMesh` (tufos,
  ~220 instâncias, cor por bioma com jitter de tom) com o mesmo
  pseudo-streaming dos props — sem colisores nem entidades.
- **Partículas ambientais por bioma**: um único `THREE.Points` (140 pontos)
  deriva ao redor do grupo; o bioma define cor/tamanho/direção — vagalumes na
  Clareira, esporos no Pântano, cinza caindo no Bosque, neve nos Picos,
  fagulhas subindo no Coração. Liga com a lore ("Vagalumes", l8).
- **Vida nas vilas**: lanternas/chamas/cristais pulsam emissão e as PointLights
  tremulam (`SettlementManager.animate`, chamado no render).

## Consequências
- Custo de runtime marginal: +1 draw call de Points, +1 InstancedMesh, ~4
  PointLights no mundo todo; nenhum pós-processamento novo.
- O update das partículas/grama roda na simulação (`WorldManager.update`),
  então fica coberto por testes de unidade; textura/tone mapping ficam na
  camada de view (coberta pelo e2e, ADR 0031).
- ACES muda levemente a percepção das cores existentes — as paletas dos
  biomas foram ajustadas junto (`data/biomes.ts`) para compensar.
