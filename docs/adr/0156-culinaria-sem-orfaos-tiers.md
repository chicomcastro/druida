# ADR 0156 — Culinária: ingredientes sem órfãos + comidas em tiers (E24.2)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
No playtest o jogador notou **ingredientes órfãos** (couro e pena não entravam em
receita nenhuma; peixe/junco/baga/ovo apareciam em ≤1 prato) e uma cozinha rasa
(3 receitas). O pedido: todo ingrediente servir a **pelo menos dois pratos**,
distribuir os ingredientes entre comidas diferentes e criar comidas **mais
raras** (mais bônus, exigindo mais nível de cozinha).

## Decisão
- **Ingredientes comestíveis** (`ingredients.ts`): os dois drops "órfãos" viram
  ingredientes de verdade — **couro→Sebo 🧈** e **pena→Ovo Selvagem 🥚** — com
  migração de save (`ensurePouch` funde os ids antigos, sem perder itens).
- **9 receitas em 3 linhas × 3 tiers** (`recipes.ts` + `consumables.ts`):
  - **Dano**: Carne Seca (N1) · Espetinho da Caça (N2) · Assado das Brasas (N3);
  - **Velocidade**: Chá de Ervas (N1) · Torta de Peixe (N2) · Geleia Gélida (N3);
  - **Defesa**: Sopa de Raízes (N1) · Ensopado Quente (N2) · Caldo do Inverno (N3).
  Cada tier é mais forte e mais duradouro e pede mais nível de Craft (tier 3 ⇒
  Craft nível 3, ≈120 XP). Como o buff é agrupado por tipo, a comida melhor
  sobrescreve a mais fraca do mesmo tipo.
- **Cobertura garantida**: `ingredientCoverage()` conta receitas por ingrediente;
  o teste `cooking.test` falha se algum ingrediente servir a <2 pratos ou se as
  linhas de buff perderem os 3 tiers crescentes.
- A UI da cozinha e o mercador (categoria food) já são orientados a dados —
  as novas comidas/receitas aparecem sem mudança extra.

## Consequências
- Distribuição por ingrediente (todos ≥2): carne 4 · ovo 3 · pimenta/cogumelo/
  sebo/erva/mel/peixe/junco/baga/cenoura 2. Nenhum órfão.
- Progressão de cozinha real: pratos fortes exigem subir o Craft cozinhando os
  fracos — casa com o funil da 1ª hora (Gate F).
- Saves antigos migram couro/pena sem perda.
