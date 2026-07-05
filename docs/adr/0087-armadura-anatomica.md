# ADR 0087 — Armadura anatômica em 4 peças (E1)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O roadmap (E1) pede slots de equipamento que sigam a anatomia do avatar
(cabeça, corpo, calças, botas), base do paperdoll do MCD (E2) e das lojas
temáticas (E5). O modelo antigo tinha uma única peça `armor`.

## Decisão
- **`ArmorSlot = head | body | legs | boots`**; `ArmorItem` ganha `slot`.
- `Loadout.armor` e `Equipment.armor` viram um **`ArmorSet`** (mapa das 4
  peças). `emptyArmor()` inicializa; `ARMOR_SLOTS` é a ordem canônica.
- **Geração por peça**: `generateItem(..., forceSlot?)`; cada peça tem seu
  tema e fração de mitigação (peito > calças > elmo > botas).
- **Agregação** em `applyEquipment` (`armorPieces`/`equippedItems`): soma
  mitigação (teto 80%), vida, regen e velocidade das 4 peças + afixos.
- **Migração v1→v2** no load: armadura única legada entra no slot `body`;
  saves já em mapa restauram peça a peça. Sem bump de versão do schema (o
  campo `armor` do snapshot aceita ambos os formatos e migra no `apply`).
- UI da mochila mostra os 4 slots no paperdoll (versão funcional; o
  paperdoll bonito do MCD é o E2).

## Consequências
- Quatro vezes mais superfície de loot/decisão de build por peça.
- Encantos (Fotossíntese/Metamorfo) e o auto-equip passam a varrer todas as
  peças; compat com item único preservada nos pontos sensíveis.
