/**
 * Registro de modelos .glb por "kind" (mesmo identificador usado em
 * `buildMesh`). Vazio por padrão: sem entradas, tudo cai no voxel procedural e
 * o `GLTFLoader` nem entra no bundle (ver `modelLoader.ts`).
 *
 * Para ativar um modelo real:
 *   1. coloque o arquivo em `public/assets/models/<file>.glb`;
 *   2. adicione uma entrada aqui (ex.: `wolf: { file: 'wolf.glb', scale: 1 }`);
 *   3. se o bundle crescer além do orçamento, ajuste `.size-limit.json`.
 * Ver docs/asset-pipeline.md e ADR 0036.
 */
export interface ModelDef {
  file: string;
  /** Escala uniforme aplicada ao modelo carregado (padrão 1). */
  scale?: number;
  /** Deslocamento vertical para alinhar os "pés" ao solo (y=0). */
  yOffset?: number;
}

export const MODELS: Record<string, ModelDef> = {
  // Exemplos (descomente quando o .glb existir em public/assets/models/):
  // druid:     { file: 'druid.glb' },
  // wolf:      { file: 'wolf.glb' },
  // bear:      { file: 'bear.glb' },
  // raven:     { file: 'raven.glb' },
  // frog:      { file: 'frog.glb' },
  // rotboar:   { file: 'rotboar.glb' },
  // shadecrow: { file: 'shadecrow.glb' },
  // fungling:  { file: 'fungling.glb' },
  // husk:      { file: 'husk.glb' },
  // shaman:    { file: 'shaman.glb' },
  // rotlord:   { file: 'rotlord.glb', scale: 1 },
};

// `base: './'` no Vite → usa BASE_URL para funcionar em deploy estático.
const BASE = (import.meta as any).env?.BASE_URL ?? '/';

export function modelUrl(file: string): string {
  return `${BASE}assets/models/${file}`;
}
