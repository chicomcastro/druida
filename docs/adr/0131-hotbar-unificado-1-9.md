# ADR 0131 — Hotbar unificado 1–9: formas + skills reatribuíveis (E17.5)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Depois do E17.3b, as teclas 1–4 eram skills e 5–9 eram formas, em faixas fixas.
O pedido original era uma **hotbar 1–9 estilo Minecraft**, onde o jogador põe o
que quiser em qualquer slot. Faltava unificar a fileira e deixar as skills
usarem os slots vagos (7–9 no começo do jogo ficavam mortos).

## Decisão
- **Uma fileira, dois tipos de slot**: o modelo do hotbar já era um array de 9
  ids de habilidade (ADR 0126) — **sem mudança de save**. As **formas** ocupam
  uma faixa contígua a partir de `FORM_SLOT_START` (índice 4 → teclas 5, 6, …),
  na ordem de `form.list`; **todo slot fora dessa faixa** é de habilidade.
  - `isFormSlot(slot, formCount)` e `skillSlots(formCount)` centralizam a regra.
  - Com 2 formas (início): formas nas teclas 5–6; skills em 1–4 e **7–9**.
- **Input unificado** (`bindings`/`InputManager`): as teclas 1–9 viram
  `hotbar0–8`; some `form0–4` do teclado. `intent.hotbar` passa a ter 9 slots.
  O `switchForm` fica só para **d-pad do gamepad** e o botão de forma do **touch**.
- **Ativação** (`playerControl`): um único laço sobre os 9 slots — slot de forma
  → troca de forma (com toggle de volta ao humanoide); slot de skill → conjura.
- **HUD**: 9 células montadas dinamicamente (forma com destaque da atual; skill
  com ícone do ramo + cooldown; vazio caso contrário).
- **Atribuição** (painel de Talentos): os botões de slot de cada skill liberada
  agora oferecem **só os slots livres de forma** (`skillSlots(formCount)`), e o
  auto-equipar ao liberar respeita a mesma lista.
- **Fix de borda**: o estado do `TouchControls` ganhou `hotbar` (9 falsos) — sem
  ele, o `_merge` quebrava em dispositivos touch (regressão latente do E17.3b).
- Poções seguem em **Q/R** (fora do escopo desta fatia).

## Consequências
- Hotbar 1–9 de fato: skills se espalham pelos slots vagos e são remapeáveis; as
  formas mantêm suas teclas por padrão. Sem migração de save (o array de ids
  continua o mesmo; a semântica de "slot de forma" é derivada de `form.list`).
- Testes cobrem `isFormSlot`, `skillSlots` e o auto-fill respeitando a faixa.
- Futuro possível: mover formas livremente (hoje são derivadas, não reatribuíveis)
  e trazer poções para a fileira — exigiria trocar o modelo por entradas tipadas.
