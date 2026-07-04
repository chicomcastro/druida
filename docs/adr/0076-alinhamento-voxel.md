# ADR 0076 — Alinhamento voxel: rotações só em 90° (M16.3)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
No MCD nada é "torto": construções, bancas e pedras seguem a direção dos
voxels. Nosso cenário tinha rotações arbitrárias herdadas do estilo antigo
(casas em `atan2` livre, cabanas a 0.3–0.9 rad, barco a 0.7, serraria a
0.6, ruínas e pedras a `rng()*π`).

## Decisão
- Helper **`snap90()`**: todo ângulo de cenário arredonda para múltiplos de
  90°. Casas do hub continuam "olhando o centro", mas no grid.
- **Dados autorais re-alinhados**: palafitas, passarelas (agora ortogonais,
  lendo como grade de píer), cabanas, serraria, barco e tendas usam 0/±π/2
  explícitos.
- **Ruínas de POI e pedras**: rotação instanciada em passos de 90°.
- **Cairns do Degelo**: pilhas de caixas decrescentes (dodecaedros
  aposentados aqui); cristais de gelo em pé, girados no grid.
- **Removidos** resquícios da era cônica: varas cruzadas das tendas, tilt
  dos juncos e dos menires, giro do totem.
- **Exceções conscientes**: animações de vento/balanço (bandeiras, barco) e
  o caimento dos telhados — avaliar telhado em degraus no M16.4.

## Consequências
- Vilas leem como "construídas em Minecraft"; a passarela do Vau vira uma
  grade de píer ortogonal muito mais clara.
- Personagens continuam livres (rotação de NPCs/inimigos não é cenário).
