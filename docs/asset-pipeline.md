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

## Esboço de integração

```ts
// src/core/assets/AssetLoader.ts (a criar)
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
const cache = new Map<string, THREE.Object3D>();

export async function preload(urls: Record<string, string>) {
  await Promise.all(Object.entries(urls).map(([kind, url]) =>
    loader.loadAsync(url).then((g) => cache.set(kind, g.scene))));
}
export function model(kind: string) {
  return cache.get(kind)?.clone();
}
```

```ts
// meshes.ts — buildMesh passa a preferir o modelo carregado
import { model } from '../core/assets/AssetLoader.js';
export function buildMesh(kind) {
  const m = model(kind);
  if (m) { m.userData.kind = kind; return m; }
  /* ...fallback voxel atual... */
}
```

- Pré-carregar no menu principal (antes de `game.start()`), com tela de loading.
- Animações (se houver): usar `AnimationMixer` e trocar clip por estado
  (idle/andar/atacar) num pequeno componente de animação.

## Convenções

- **Escala**: 1 unidade de mundo ≈ 1 "metro"; o Druida tem ~2u de altura.
- **Origem**: pés no `y = 0`, centrado em XZ (os sistemas posicionam pelo
  `Transform` no plano e aplicam `y` por offset).
- **Orientação**: frente para `+Z` (o `RenderSyncSystem` aplica `rotation.y`).
- **Sombras**: `castShadow`/`receiveShadow` nas malhas relevantes.
- **Performance**: para props repetidos, manter o caminho de **InstancedMesh**
  (ADR 0015) — instanciar a geometria do `.glb`.

## Status

Placeholders são suficientes para o protótipo. Este pipeline é o caminho para
arte final quando o jogo entrar em produção de conteúdo (backlog M10).
