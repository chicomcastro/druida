# ADR 0133 — Hotbar livre: equipar/poção pelo inventário + swap-back (E18.2)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
O E18.1 deixou o modelo do hotbar tipado (skill/forma/poção/equip) e ativou
skill/forma/poção. Faltava o que o jogador mais pediu para equipamentos: **pôr
arma/armadura/poção na barra pela tela de inventário** e **trocar de equipamento
por tecla** — sem perder o item que estava equipado.

## Decisão
- **Atribuição pelo inventário** (`Menus.ts`): com a mochila aberta, passar o
  mouse sobre um item (na grade ou no paperdoll) e teclar **1–9** atribui aquele
  item ao slot — `assignPotion` para consumíveis, `assignEquip` para arma/armadura
  (artefatos/dons seguem em U/I/O). Como a mochila pausa o jogo, as teclas 1–9
  não conjuram ao mesmo tempo. O rastreio de hover usa `addEventListener` para
  não colidir com o tooltip (`_bindTip`, que usa `onmouseenter`).
- **Troca de equipamento com swap-back** (`playerControl`): acionar um slot
  `equip` equipa o item da mochila **e devolve o que estava equipado à mochila**
  (em vez de descartá-lo). Se o item não está mais na mochila (já equipado), é
  no-op.
- **Prune** (`Menus.ts` `_pruneEquipEntries`): ao desmanchar (salvage) ou trocar
  equipamento, entradas `equip` cujo uid não é mais possuído (mochila + equipado)
  saem da barra — sem slots-fantasma.
- **HUD**: célula `equip` mostra ⚔️ (arma) / 🛡️ (armadura) resolvendo o uid na
  mochila/equipado (ADR 0132 já previa o tipo).
- Dica da mochila atualizada: "passe o mouse e tecle 1–9 p/ pôr na hotbar".

## Consequências
- A barra 1–9 agora recebe **tudo que é acionável** montável pelo jogador: skill,
  forma, poção e equipamento — atendendo à intenção do épico E18.
- Verificado por print: arma (⚔️) e poção (🧪 ×2) postas na barra via hover+tecla
  no inventário.
- Próximo (opcional): **E18.3** — comida/buff (conteúdo novo; hoje só há poções
  de cura/seiva), a confirmar.
