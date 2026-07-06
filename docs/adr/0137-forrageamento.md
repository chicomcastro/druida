# ADR 0137 — Forrageamento: nós de coleta no mundo (E19.3)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Os ingredientes de origem vegetal (ervas, cenoura, cogumelo, peixe, bagas…)
precisavam de **lugares para coletar ao longo do mapa** — não caem de inimigos
(que soltam partes animais, E19.1). Faltava o forrageamento.

## Decisão
- **`ForageManager`** (`world/ForageManager.ts`): espalha ~24 **nós de coleta**
  em anéis a partir da origem (mesma lógica dos acampamentos, ADR 0017), com RNG
  semeado. Evita assentamentos (`settlements.isSafe`) e escolhe o ingrediente
  pelo **bioma** do ponto (`forageOf(biomeAt)`), então cada região tem sua flora
  (clareira: erva/cenoura/cogumelo/mel; pântano: peixe/junco; degelo: baga;
  cinza: pimenta).
- **Nó = entidade interativa**: Transform + Renderable (moita voxel com "frutos"
  na cor do ingrediente) + `Interactable { kind: 'forage', ingredient }`.
- **Colher** (`interaction.ts` → `forage.collect`): E adiciona 1 à despensa,
  esconde o nó e agenda **respawn** (60 s). `update(dt)` religa o nó ao fim do
  tempo.

## Consequências
- Fecha o ciclo de obtenção de ingredientes: **caçar** (partes animais) +
  **colher** (vegetais no mundo) → cozinhar. Cada bioma incentiva explorar por
  sua flora.
- Nós reaparecem, então a fonte é renovável (sem persistência de estado — o
  mundo é semeado; colheita reseta no reload, aceitável).
- Verificado por print (moitas com "frutos" na Clareira) e testes (scatter com
  ingredientes válidos, colher +1/uso único, respawn).
- Falta só **E19.4**: mercador comprar/vender ingredientes e comida.
