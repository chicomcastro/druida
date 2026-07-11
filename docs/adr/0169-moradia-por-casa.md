# ADR 0169 — Moradia por-casa (cada lar é um recinto próprio) (E36)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
No cronograma (E34/ADR 0167) as portas de casa ('home') colapsavam num **único
recinto compartilhado** por vila — entrar em qualquer casa mostrava a mesma
"casa genérica". Faltava **moradia por-casa**: encontrar a família certa dentro
da casa dela, e cada morador ir dormir/almoçar na SUA casa.

## Decisão
1. **Cada porta 'home' vira um recinto próprio** (`SettlementManager._indexVenues`):
   em vez de deduplicar por tema, cada porta de moradia recebe um **id único**
   (`home#<vila>#<n>`), `kind: 'home'` e a **família** (householdId) do lar mais
   próximo. A porta guarda seu `venueId`.
2. **Cada morador aponta pra SUA casa** (`_homeVenueFor` → `rec.homeVenueId`):
   a moradia da sua família (ou a mais próxima do seu lar).
3. **Cronograma manda pra casa certa** (`npcSchedule`): a objetivo `home` (e o
   subconjunto de `sleep` que dorme em casa) leva o NPC ao **seu** `homeVenueId`,
   não a uma casa qualquer. Moradias (`kind: 'home'`) **saem do pool social/
   trabalho** (`classifyVenues`) — ninguém "se reúne" numa casa alheia.
4. **A porta leva à casa certa** (`InteriorManager.enter(theme, label, venueId)` +
   `interaction`): a porta passa seu `venueId`; o interior mostra exatamente
   `residentsInVenue(vila, venueId)` — a família daquela casa. Emergência e
   recolhimento (E33/E34) passam a casar por **id de recinto**, não por tema.

## Consequências
- Entrar em casas diferentes mostra **famílias diferentes**; à noite/almoço cada
  um está na SUA casa (some da multidão, coerente com o cronograma). Sair e voltar
  encontra a mesma família (determinístico por horário/dia).
- Travado por testes (`npcSchedule.test`: moradia fora do pool social; objetivo
  'casa' → própria moradia. `interiors.test` E36: várias casas distintas, cada
  uma mostra sua família, ocupantes moram ali). 369 testes verdes, `tsc` limpo,
  `vite build` ok. Runtime: Clareira com **6 moradias distintas**, 5 ocupadas ao
  almoço; entrar numa porta mostra exatamente aquela família.

## Limitação / futuro
Só a Clareira tem portas de tema 'home' hoje; Vau/Cinzafolha/Degelo usam temas de
casa especializados e ainda não têm moradias entráveis — isso entra no E38 (vila
viva nas demais vilas), que vai dar a elas casas e famílias como a primeira.
