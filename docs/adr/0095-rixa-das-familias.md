# ADR 0095 — Camada social: rixa das famílias (E5.2)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O E5 ("Vila 1 viva") pede uma camada social: duas famílias/clãs com uma rixa,
diálogos que se referenciam, segredos no codex e ganchos para quests. O E5.1
(ADR 0094) já entregou os interiores e semeou os nomes das famílias nas falas
da liderança/salão; falta transformar isso em conteúdo explorável.

## Decisão
- **`data/families.ts`**: `FAMILIES` (Fenwick, da forja; Aldren, dos campos)
  com nome, ofício, cor e uma **fofoca que acusa a família rival** — o texto
  de uma referencia explicitamente a outra.
- **Codex da rixa** (`data/lore.ts`): três fragmentos novos que contam o arco
  — a origem do conflito (a nascente disputada), o **segredo** (foi a
  Corrupção que envenenou a água, não a forja nem o moinho) e a **pista de
  reconciliação** (o antigo costume do nó de duas cordas guardado pela anciã).
- **NPCs afiliados**: cada tema de interior (ADR 0094) ganha `family` e
  `loreId`. A armeira é Fenwick, o curtidor é Aldren; suas falas de loja agora
  incluem a fofoca contra a outra família. Cronista e liderança guardam o
  segredo e a pista.
- **Revelação por conversa** (`revealLore` em `data/lore.ts`): falar com um NPC
  que guarda um `loreId` adiciona o fragmento ao codex **uma vez** e emite o
  aviso. O despacho (`interaction.ts`) chama `revealLore` para qualquer
  interativo com `loreId`; lojas (`merchant`) passam a exibir a fofoca antes de
  abrir o estoque.

## Consequências
- A vila fica socialmente legível: explorar os interiores conta uma história
  (duas versões parciais + a verdade escondida), premiando a conversa com
  progresso de codex — gameplay sem combate (mira do Gate D).
- O arco fica pronto para virar **quest** no E6 (mediar/reatar o nó): os dados
  (famílias, fragmentos, pista) e o gancho da anciã já existem; falta a
  máquina de objetivos/triggers, que é o próprio escopo do E6.
- `revealLore` é reutilizável por qualquer NPC/POI — some com a necessidade de
  espalhar orbes de lore só para contar história.
