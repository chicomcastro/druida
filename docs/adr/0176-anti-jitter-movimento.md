# ADR 0176 — Anti-jitter do movimento sintético (NPCs e fauna) (E46)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
Ao observar um morador (ou um bicho), ele "vibrava" — andava e ficava indo **pra
frente/pra trás** a cada frame, como se piscasse na tela. Reproduzido de forma
headless (vila real, 15 s): o pior morador **invertia a direção 543 vezes em 564
frames de movimento**; 8 dos 43 moradores tinham jitter forte (1846 inversões no
total).

**Causa.** O `SettlementManager._wander` escrevia a velocidade **crua** do
steering a cada frame. Na borda de uma estrutura (`avoidForce`, peso 1.8) ou da
rua (`streetForce`), a força de desvio supera o desejo por 1 frame → a direção
**inverte 180°** → no frame seguinte o desejo volta a mandar → inverte de novo.
Sem nenhuma suavização, isso vira uma oscilação de 1 frame: o NPC treme no lugar
e a rotação (`atan2`) pisca. A fauna tinha o análogo na **borda do raio de fuga**:
foge → sai do raio → passeia (volta) → entra no raio → foge (ping-pong).

## Decisão
1. **Helpers puros** em `gameplay/steering.ts` (testáveis):
   - `approach(cur, target, dt, tau=0.18)` — passa-baixa: aproxima a velocidade
     do alvo em ~`tau`s, **sem ultrapassar**. Uma inversão de 1 frame passa a só
     **frear** o NPC (ele pára na borda) em vez de jogá-lo pra trás.
   - `turnToward(cur, target, dt, rate=8)` — gira pelo **menor arco**, no máximo
     `dt*rate`/frame: acaba com o flip instantâneo de 180° na rotação.
2. **`SettlementManager._wander`**: velocidade suavizada por `approach` (estado
   `v._vx/_vz`, zerado ao parar) e rotação por `turnToward`.
3. **`FaunaManager`**: mesma suavização + **histerese de fuga** — começa a fugir
   dentro de `flee`, mas só relaxa além de `flee*1.6` (a banda separa os dois
   estados e mata o ping-pong na borda).

## Consequências
- Jitter praticamente eliminado (medido na mesma vila): **1846 → 17 inversões**
  (−99%), moradores com jitter **8 → 0**, o pior caiu de **543 → 2**. Fauna na
  borda do raio de fuga: **0 inversões** em 600 frames. O movimento fica suave; o
  NPC desacelera e pára na borda de uma casa em vez de tremer.
- **Regressão travada por teste**: `steering.test` (helpers `approach`/`turnToward`)
  e `settlements.test` — canary que roda a vila real 480 frames e exige o pior
  morador com **< 25** inversões (antes, 500+).
- 399 testes verdes, `tsc` limpo, `vite build` ok. Ajustado o teste "moradores
  passeiam" para a velocidade RAMPAR (a suavização entra em ~0.18 s).

## Adendo (E48) — auditoria dos demais agentes
Depois de corrigir aldeões/fauna, auditamos **todos os agentes que se movem** para
ver se o jitter aparecia noutro lugar (inimigos, chefes, invocações, loot):

- **Inimigos** (`ai.ts`): só **perseguem** (melee, rumo direto ao alvo) ou
  **mantêm distância com banda morta de ±1.5** (ranged) — sem forças de steering
  conflitantes, então não invertem 180°. Medido: um pack de 6 melee colado no
  jogador dá **0** reversões; um pack misto perseguindo um jogador em movimento por
  15 s dá **~8** (imperceptível). Contra as **1846** dos aldeões antes do fix.
- **Chefes** (`boss.ts`): não mexem em velocidade — só telegrafam slams e invocam;
  o deslocamento vem da IA melee base (mesma de cima, sem jitter).
- **Invocações** (`ally_*`): usam a mesma IA de perseguição — idem.
- **Loot** (`pickups.ts`): puxado em linha reta para o jogador — sem reversão.

**Conclusão:** o bug era exclusivo dos agentes com steering combinado (aldeões/
fauna), já corrigido. Os demais estão limpos por construção. Travado por
`tests/agentJitter.test.ts` (pack de inimigos com < 10–20 reversões), para pegar
uma regressão caso alguém dê steering aos inimigos sem suavizar. **Nenhuma
mudança de código de produção foi necessária no E48.**

## Futuro
Aplicar a mesma suavização a qualquer novo agente ambiente; considerar
interpolação visual no `renderSync` (usar o `alpha` do loop) para telas de alta
taxa de atualização.
