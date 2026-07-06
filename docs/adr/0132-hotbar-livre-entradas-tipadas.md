# ADR 0132 — Hotbar totalmente livre: entradas tipadas (E18.1)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
O E17 entregou uma barra 1–9 onde formas ficavam numa faixa fixa e skills nos
demais slots. A intenção do jogador, porém, é uma barra **totalmente livre**:
qualquer coisa acionável — habilidade, forma, poção, comida, arma ou armadura —
em qualquer slot, montada conforme o estilo de jogo. Isso exige trocar o modelo
(array de ids de habilidade) por **entradas tipadas**.

## Decisão
- **Modelo tipado** (`gameplay/hotbar.ts`): cada slot guarda
  `{ k: 'skill' | 'form' | 'potion' | 'equip', id }` ou `null`. `id` é o id da
  habilidade / forma / nome do grupo de poção / uid do equipamento.
- **Migração de save**: `ensureHotbar` converte o formato antigo (string = id de
  habilidade) em `{ k: 'skill', id }`, sem perder as barras já montadas.
- **Atribuição sem duplicar** (`setEntry` + `sameEntry`): `assignSkill`,
  `assignForm`, `assignPotion`, `assignEquip`, `clearSlot`, `placeEntry`.
- **Formas viram entradas livres**: `seedForms` semeia as formas a partir da
  tecla 5 em jogo novo e ao desbloquear (via `story.unlockForm`), mas elas podem
  ir para **qualquer** slot. Some a faixa fixa do E17.
- **Ativação** (`playerControl`): um laço nos 9 slots — skill conjura; forma
  troca (com toggle ao humanoide); poção bebe da mochila pelo nome
  (`useConsumableNamed`). `equip` (troca de arma/armadura com swap-back) fica
  para o **E18.2**, junto da atribuição pelo inventário.
- **HUD** (`Hud.ts`): 9 células por tipo — skill (ícone do ramo + cooldown),
  forma (ícone + destaque da atual), poção (🧪 + contagem viva), equip (⚔️/🛡️).
- **Talentos**: botões de slot 1–9 para skills liberadas **e** para cada forma
  (secção "Formas"), com destaque do slot atual e clique-de-novo p/ desatribuir.

## Consequências
- A barra passa a misturar tipos livremente (validado por print: skills, formas
  remapeadas e poção com contagem convivendo).
- Save antigo migra transparente; `game.progress.hotbar` continua persistindo.
- Próximo: **E18.2** — atribuir equipamento e poções pela tela de inventário +
  troca de equipamento por tecla (com swap-back) + prune ao vender/desmanchar.
  **E18.3** (opcional): comida/buff, que é conteúdo novo.
