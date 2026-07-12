# ADR 0180 — Porta do interior alinhada à entrada + 1 toque = 1 interação (E55)

**Status:** Aceito · **Data:** 2026-07-12

## Contexto
Ao entrar numa casa, o jogador era teleportado para o **fundo** da sala (parede
norte, `ROOM.z - rz + 3`), enquanto a **porta de saída** fica na parede **sul**
(`ROOM.z + rz - 1.4`). Ou seja: você atravessava a porta da frente do modelo
externo e reaparecia na parede oposta, do outro lado da sala — a porta do interior
não correspondia à porta por onde se entrou.

## Decisão
1. **Entrar junto à porta** (`InteriorManager.enter`): o jogador surge **colado à
   porta de saída** (parede sul, `ROOM.z + rz - 3`), **de frente para a sala**
   (`rot = π`, olhando -z). Agora atravessar a porta te deixa nela, com o
   NPC/balcão à frente e a saída logo atrás — coerente com o exterior.
2. **1 toque de E = 1 interação** (`interactionSystem`): passa a agir só no
   interativo **mais próximo** em alcance, por jogador. Sem isso, entrar (que
   teleporta o jogador para junto da saída recém-criada) dispararia **enter e
   exit no mesmo quadro** — o jogador entraria e sairia instantaneamente. Bug
   latente que o novo ponto de spawn expôs; a correção também evita acionar dois
   interativos sobrepostos de uma vez.

## Consequências
- A porta do interior corresponde à entrada; nada de "teleporte" para a parede do
  fundo. `intent.interact` é edge-detected (`keyJustPressed`), então entrar e sair
  seguem em toques separados.
- Travado por testes (`interiors.test`): entra a < 4u da saída e **não** sai no
  mesmo toque; um toque de E aciona só o interativo mais próximo (aldeão perto age,
  baú longe não).
- 413 testes verdes, `tsc` limpo, `vite build` ok.

## Futuro
Opcional: espelhar o **lado** da porta externa (offset −0.7) na parede do interior
para correspondência ainda mais fina; hoje a saída fica centralizada na parede sul.
