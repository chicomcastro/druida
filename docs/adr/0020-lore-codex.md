# ADR 0020 — Colecionáveis de lore (codex)

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Faltava worldbuilding difuso e um incentivo extra à exploração além de loot e
essência.

## Decisão
**Páginas de lore** (`data/lore.ts`) aparecem raramente no mundo (geradas pelo
`WorldManager`, só entradas ainda não descobertas e não ativas). Ao coletar, a
página é registrada no **codex** (`game.lore.found`, persistido no save) e o
texto é exibido na caixa de diálogo. Reaproveita o sistema de pickup/orbe.

## Consequências
- Recompensa narrativa por explorar, sem bloquear progressão.
- Adicionar lore é editar `data/lore.ts`.
- Uma tela de codex dedicada (listar tudo já encontrado) pode vir depois; por
  ora o diálogo + contador no objetivo bastam.
