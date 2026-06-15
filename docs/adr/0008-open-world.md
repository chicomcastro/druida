# ADR 0008 — Mundo aberto: zonas radiais + pseudo-streaming

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
A grande alteração frente ao MC Dungeons é ser mundo aberto. Precisávamos de um
mundo contíguo com gradiente de dificuldade e sem telas de carregamento, mas
viável em WebGL.

## Decisão
- **Zonas de bioma em anéis concêntricos** a partir do hub (origem):
  Clareira → Pântano → Bosque Cinza → Picos → Coração Corrompido. `biomeAt(x,z)`
  resolve o bioma pela distância. Afastar-se = mais difícil, naturalmente.
- **Hub** na origem (Carvalho-Mãe), zona segura sem spawns.
- **Pseudo-streaming de props**: árvores/rochas são geradas em anel ao redor do
  grupo e descartadas ao se distanciar (`WorldManager`), mantendo a contagem de
  objetos limitada.
- Spawner mantém população de inimigos perto dos jogadores, fora da zona segura.

Optamos por zonas radiais em vez de chunks persistentes com geração autoral
completa para entregar a sensação de mundo aberto rapidamente. Chunks
persistentes e biomas handcrafted ficam como evolução (backlog).

## Consequências
- Mundo "infinito" e coeso já jogável.
- Sem persistência de áreas exploradas/limpas ainda; layout é
  procedural/uniforme dentro do bioma (a enriquecer com POIs e masmorras).
