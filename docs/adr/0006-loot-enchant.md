# ADR 0006 — Loot, raridades e encantamentos

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
O loop de farm é central no gênero. Precisávamos de um modelo de itens que mude
o build, fiel ao MC Dungeons, mas simples de gerar.

## Decisão
- **Tipos:** arma de conjuração (dano + elemento), armadura (sobrevivência +
  bônus) e artefato (concede habilidade ativa).
- **Raridades:** Comum/Raro/Único, com multiplicador de poder e número de slots
  de encantamento crescentes (`RARITIES`).
- **Encantamentos:** cada item ganha slots; alguns têm efeito funcional
  (Ferocidade = +dano, Vigor = +vida, Fotossíntese = regen parado, Metamorfo =
  onda ao trocar de forma), outros são poder/flavor a expandir.
- Itens são gerados proceduralmente a partir de bases + raridade + nível, com
  RNG seedável.
- Stats derivados aplicados via `applyEquipment` (vida, regen, mitigação).

No protótipo, itens são **auto-equipados** em slots vazios (qualidade de vida);
a tela de inventário/encantamento completa é um item de backlog (M8).

## Consequências
- Drops já alteram o personagem imediatamente.
- Pontos de encanto vêm do nível de grupo; gastá-los manualmente exige a UI de
  encantamento (pendente).
