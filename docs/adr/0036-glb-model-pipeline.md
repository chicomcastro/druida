# ADR 0036 — Pipeline de modelos .glb (com fallback procedural)

**Status:** Aceito · **Data:** 2026-06-19

## Contexto
Todos os modelos eram voxels procedurais (caixas) em `meshes.ts`. Queremos poder
usar modelos reais `.glb` (MagicaVoxel → glTF) sem reescrever sistemas e sem
inflar o bundle enquanto não há assets. O CI tem guarda de tamanho
(`.size-limit.json`, 185 kB brotli) que mede **todos** os chunks `dist/assets/*.js`
— inclusive dinâmicos.

## Decisão
- **`modelRegistry.ts`**: `MODELS: Record<kind, { file, scale?, yOffset? }>`,
  **vazio por padrão**, + `modelUrl()` (respeita `BASE_URL`).
- **`modelLoader.ts`**: `preloadModels()` importa o `GLTFLoader`
  **dinamicamente e apenas se há modelos registrados** — com a registry vazia,
  nada é importado e o bundle não muda. `getModel(kind)` devolve um clone do
  modelo carregado ou `null`.
- **`buildMesh(kind)`** usa o clone do `.glb` quando disponível; senão, o voxel
  procedural. Erro de carregamento → `console.warn` e fallback (jogo nunca
  quebra por asset faltante).
- Bootstrap faz `await preloadModels()` antes de spawnar.

## Consequências
- Pronto para arte real: basta colocar o `.glb` em `public/assets/models/` e
  registrar a entrada (e, no 1º modelo, ajustar o `size-limit`, pois o
  `GLTFLoader` passa a ser empacotado).
- Sem assets, comportamento e bundle ficam idênticos (CI verde; 154 kB brotli).
- Animação por `AnimationMixer` (idle/andar/atacar) fica como próximo passo.
