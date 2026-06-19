# 🎨 Pipeline de Assets (voxel → glTF)

Hoje todos os modelos são **placeholders voxel** montados em código com caixas
do Three.js (`src/entities/meshes.ts`, props/marcos nos `*Manager`). Este
documento descreve como substituí-los por modelos reais sem mudar os sistemas.

## Princípio

O render é desacoplado da simulação: o `RenderSyncSystem` apenas liga
`Transform → Object3D`. Trocar um placeholder por um `.glb` é trocar o que
`buildMesh(kind)` retorna — nada mais muda.

## Fluxo recomendado

1. **Modelar** em [MagicaVoxel](https://ephtracy.github.io/) (estética voxel
   coerente com o jogo).
2. **Exportar** como `.obj`/`.gltf` ou converter `.vox → .glb` (ex.:
   [voxel2gltf](https://github.com/) ou Blender com o plugin de import `.vox`).
   Preferir **`.glb`** (binário, um arquivo, com texturas embutidas).
3. **Otimizar** com [`gltf-transform`](https://gltf-transform.dev/) ou
   `gltfpack` (meshopt): `gltf-transform optimize in.glb out.glb`.
4. **Colocar** em `public/assets/models/<nome>.glb`.
5. **Carregar** via um `AssetLoader` com `GLTFLoader` (cache por url) e fazer
   `buildMesh(kind)` retornar o clone do modelo carregado em vez das caixas.

## Integração (implementada — ADR 0036)

O pipeline já existe no código:

- **`src/entities/modelRegistry.ts`** — mapeia `kind → { file, scale?, yOffset? }`.
  Começa **vazio**: sem entradas, o jogo usa voxels e o `GLTFLoader` nem entra
  no bundle.
- **`src/entities/modelLoader.ts`** — `preloadModels()` (importa o `GLTFLoader`
  dinamicamente **só** se há modelos registrados) e `getModel(kind)` (clone do
  modelo carregado, ou `null`).
- **`buildMesh(kind)`** (`meshes.ts`) — retorna o clone do `.glb` quando há um
  carregado; senão, o voxel procedural. Falha de carregamento cai no voxel
  (com `console.warn`), sem quebrar o jogo.
- O bootstrap (`main.ts`) chama `await preloadModels()` antes de spawnar.

### Para ativar um modelo

1. Coloque o arquivo em `public/assets/models/<file>.glb`.
2. Adicione a entrada no `MODELS` do `modelRegistry.ts`
   (ex.: `wolf: { file: 'wolf.glb', scale: 1, yOffset: 0 }`).
3. Rode `npm run size` — ao registrar o 1º modelo, o `GLTFLoader` passa a ser
   empacotado (~chunk extra). Ajuste o orçamento em `.size-limit.json` se
   necessário.

- Animações (se houver): usar `AnimationMixer` e trocar clip por estado
  (idle/andar/atacar) num pequeno componente de animação (próximo passo).

## Convenções

- **Escala**: 1 unidade de mundo ≈ 1 "metro"; o Druida tem ~2u de altura.
- **Origem**: pés no `y = 0`, centrado em XZ (os sistemas posicionam pelo
  `Transform` no plano e aplicam `y` por offset).
- **Orientação**: frente para `+Z` (o `RenderSyncSystem` aplica `rotation.y`).
- **Sombras**: `castShadow`/`receiveShadow` nas malhas relevantes.
- **Performance**: para props repetidos, manter o caminho de **InstancedMesh**
  (ADR 0015) — instanciar a geometria do `.glb`.

## Status

Pipeline de carregamento **implementado** (ADR 0036), com fallback procedural.
Faltam os assets `.glb` em si — basta produzi-los (MagicaVoxel → glTF) e
registrá-los. Até lá, os voxels placeholder seguem em uso.
