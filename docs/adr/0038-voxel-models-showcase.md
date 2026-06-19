# ADR 0038 — Modelos voxel data-driven + vitrine (backoffice)

**Status:** Aceito · **Data:** 2026-06-19 · **Relaciona:** ADR 0036

## Contexto
Os modelos eram caixas soltas montadas em código, pouco caracterizadas. O
objetivo é uma estética **Minecraft Dungeons** (cabeça cúbica grande, corpo
blocado com placas, silhuetas distintas e armas próprias), além de poder
**inspecionar** modelos/animações fora do jogo.

## Decisão
- **`src/entities/voxelModels.ts`**: modelos **data-driven** como conjunto de
  PARTES nomeadas (`head`/`torso`/`armR`/`legL`/`weapon`/…). Cada parte é um
  grupo na sua JUNTA (ombro/quadril/pescoço) com caixas relativas — pronto para
  **animação procedural** (girar partes em torno das juntas). Cada spec declara
  o `gait` (biped/quadruped/bird/static). Geometria unitária + materiais por cor
  compartilhados.
- **`buildMesh`** passa a priorizar: (1) `.glb` carregado (ADR 0036); (2) modelo
  voxel data-driven; (3) caixas legadas (fallback). A simulação não muda.
- **Vitrine** (`showcase.html` + `src/showcase/main.ts`): rota separada,
  estilo backoffice, com lista de modelos (formas/inimigos/armas), visualizador
  3D (órbita manual + turntable) e a mesma iluminação do jogo. Build **multipage**
  no Vite (`index` + `showcase`); deploy no Pages publica `dist/showcase.html`.

## Consequências
- Modelos mais legíveis e distintos, reutilizados por jogo e vitrine (fonte
  única de verdade via `buildMesh`).
- Base pronta para animação procedural (próximo passo): as partes nomeadas e o
  `gait` já existem.
- Bundle ~159 kB brotli (dentro do orçamento); vitrine compartilha o chunk do
  Three com o jogo.
- Spec e2e `showcase.cy.ts` captura modelos como evidência visual.
