# ADR 0022 — Masmorras instanciadas

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Faltava conteúdo de combate mais intenso e focado, com recompensa de fim de
jogo, distinto da exploração aberta e dos acampamentos.

## Decisão
Masmorras como **POIs instanciados** (`DungeonManager`):
- Entradas (portais) espalhadas nos anéis médio/externo. Interagir teleporta o
  grupo para uma **arena isolada** em coordenadas remotas (`{0, 1000}`),
  cercada por muralhas (colisores estáticos).
- Enquanto dentro, `game.inDungeon = true` **suspende** mundo aberto, spawner,
  POIs e eventos — as ondas são controladas pela masmorra.
- **3 ondas** crescentes; ao vencer, surge um baú de recompensa (**Único
  garantido na primeira limpeza** + loot + essência). Depois, o grupo é
  devolvido à entrada e o clima do bioma é restaurado.
- Limpeza persistida; wipe dentro da masmorra força a saída (evita travar).

Optou-se por **uma única arena reutilizada** (teleporte) em vez de cenas
separadas — simples e suficiente, dado que só um grupo joga por vez.

## Consequências
- Conteúdo repetível com recompensa significativa, reusando IA/spawn/loot.
- Várias integrações (gates `inDungeon`); cobertas por teste de progressão de
  ondas.
- Geometria da arena é fixa; variedade de layouts fica para depois.
