# ADR 0163 — Olhos nas formas, rua explícita e decoração de interior por vila (E30)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
Três pedidos do playtest: (1) algumas **formas sem olhos** (Lobo/Urso/Corvo);
(2) aldeões **andando pelas ruas** de propósito (follow-up do ADR 0154, que só
desviava de obstáculos); (3) **decoração de interior adaptada a cada vila**.

## Decisão
1. **Olhos** (`voxelModels.ts`): adicionados aos modelos das formas que não tinham
   — Lobo (âmbar), Urso (escuro), Corvo (dourado). Fauna, inimigos e chefes já
   tinham. Imagens da wiki (forma-lobo/urso/corvo) recapturadas.
2. **Rua explícita** (`steering.streetForce` + `SettlementManager._wander`): cada
   aldeão carrega as células de rua da sua vila (`v.streets`, coord local). Longe
   do alvo (>2.5u), soma ao rumo uma **atração pela laje de rua mais próxima**
   (peso 0.8), então o povo caminha pelos caminhos em vez de cortar reto pela
   grama. Perto do alvo a atração some, para poder sair da rua e chegar à porta.
3. **Decoração por vila** (`InteriorManager`): ao entrar, a **vila de origem** é
   detectada por `settlements.settlementAt(returnPos)`; `_buildProps` ganha um
   canto com o **sotaque da vila** — barril de peixe + junco (Vau), toras + toco
   e machado (Cinzafolha), pele + bloco de gelo (Degelo), cesto de ervas + muda
   (Clareira).

## Consequências
- Formas com rosto completo; vila com povo circulando nos caminhos; interiores
  com identidade da vila além do tema do serviço.
- Travado por teste (`steering.test`: streetForce puxa quando fora, zero na rua/
  sem ruas) e verificado em runtime (aldeões seguem as ruas; interior do Vau =
  `village 'palafitas'` com a decoração de pesca). 352 testes verdes.
