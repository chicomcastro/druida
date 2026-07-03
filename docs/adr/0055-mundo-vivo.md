# ADR 0055 — Mundo vivo: vento, espécies, fumaça e moradores que passeiam

**Status:** Aceito · **Data:** 2026-07-03

## Contexto
O mundo estava bonito mas estático (feedback de playtest): vegetação parada,
vilas congeladas, moradores plantados no lugar. "Vida" ambiente é o que
separa cenário de lugar.

## Decisão
- **Vento por shader** (`WorldManager._addWind`): copas, pinheiros e grama
  balançam via `onBeforeCompile` (deslocamento senoidal do topo dos vértices,
  fase pela posição da instância — cada planta no próprio ritmo). Um uniform
  compartilhado avança no update; zero custo de CPU por instância e testes
  headless intactos (o hook só roda com WebGL real).
- **Espécies por bioma**: os Picos ganham **pinheiros** (pool instanciado
  próprio, cone + tronco curto). A decisão árvore/rocha é única por prop
  (bug clássico de dupla rolagem evitado e coberto por teste).
- **Vilas vivas** (`SettlementManager`): **fumaça de chaminé** (baforadas em
  loop na fogueira do hub, nas cabanas de Cinzafolha e na chama azul do
  Degelo), **estandartes** tremulando, **lagoa pulsando** e **barco
  balançando** no Vau.
- **Moradores passeiam** (`_wander`): moradores comuns andam entre pontos ao
  redor de "casa" com pausas; **param quando um jogador se aproxima** (para
  conversar). Movimento via `Velocity` (o movementSystem integra e colide) e
  a animação de andar vem de graça do renderSync (ADR 0039/0043). Anciãos
  ficam no posto (são quest givers).
- **Câmera salta em teleportes** (`IsoCamera.snapTo` em fast-travel/masmorra):
  o lerp suave fazia uma panorâmica de centenas de unidades após viajar —
  descoberto na verificação visual (a captura pegava o "meio do voo").

## Consequências
- O mundo respira: vento constante, fumaça subindo, gente circulando. Custo
  marginal (2 shaders adaptados, ~12 meshes de fumaça/bandeira, 9 NPCs com
  wander de O(n) por frame).
- Moradores podem se afastar alguns metros do ponto de spawn (raio ~4 de
  casa) — o prompt de conversa continua no NPC (Interactable segue o
  Transform), então nada quebra.
