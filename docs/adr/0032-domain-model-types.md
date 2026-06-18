# ADR 0032 — Modelos de domínio centralizados (`src/types.ts`)

**Status:** Aceito · **Data:** 2026-06-18

## Contexto
Os modelos do jogo (Item, Encantamento, Forma, raridade, e o schema do save)
viviam espalhados por `data/` e `gameplay/`, sem tipos compartilhados. Os
componentes ECS eram criados via fábricas em `components.ts` retornando objetos
implicitamente `any`. Isso facilitava bugs silenciosos — por exemplo, o save
gravar/ler um campo com nome errado sem o compilador reclamar.

A config de TS é intencionalmente lenient (`strict: false`, ADR 0014/0021), o
que permite adotar tipos de forma incremental e aditiva.

## Decisão
- Novo módulo **`src/types.ts`** com os modelos de domínio: `Element`,
  `Rarity`, `ItemType`, `Item` (união `WeaponItem | ArmorItem | ArtifactItem`),
  `Enchant`/`EnchantDef`, `RarityDef`, `FormId`/`FormDef`, `Team`, as formas dos
  componentes ECS (`Transform`, `Health`, `Sap`, `Loadout`, …) e o schema de
  save **`SaveV1`** + `PlayerSnapshot`.
- Aplicação dos tipos onde o ganho é maior e o risco é baixo: `loot.ts`
  (`RARITIES`/`ENCHANTMENTS`/`generateItem`), `forms.ts` (`FORMS`/`FORM_ORDER`),
  `components.ts` (retorno das fábricas; `Factions` vira `as const`) e
  `save.ts` (`serialize`/`apply`/`loadFromStorage`).

## Consequências
- O compilador passa a pegar divergências de schema (ex.: o save) e de itens.
- Adoção incremental: código que ainda usa `any` continua compilando; novos
  trechos podem importar os tipos via `import type`.
- Base para endurecer mais adiante (tipar o `Game` e os sistemas).
