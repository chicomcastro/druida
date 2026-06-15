# ADR 0004 — Fantasia do Druida: Seiva + formas + elementos

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
A série é "uma classe por jogo". O Druida precisa de profundidade própria sem
seleção de classes. Era preciso definir o recurso e os eixos de poder.

## Decisão
Três eixos, transitáveis em combate:
1. **Elemental** — magias com status (queimar/congelar/enraizar/atordoar).
2. **Formas animais** — Lobo, Urso, Corvo, Sapo: cada uma é um moveset
   alternativo, com `speedMul`, `attackCooldown`, custo de Seiva/s e bônus
   (ex.: Urso reduz dano).
3. **Comunhão** — invocações (matilha) e totens (cura).

**Recurso = Seiva**: enche atacando (formas/básicos geram Seiva), drena ao
manter formas e ao conjurar magias/artefatos. Esgotar a Seiva reverte à forma
humanoide. Isso cria a tensão "acumular ↔ gastar" e evita ficar 100% em forma.

Sem árvore de talentos: o build vem do **equipamento** (arma + armadura + 3
artefatos + encantamentos), como no MC Dungeons.

## Consequências
- Trocar de forma é a principal expressão tática.
- Balanceamento futuro concentra-se em custo de Seiva × poder das formas.
