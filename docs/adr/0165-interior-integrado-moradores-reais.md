# ADR 0165 — Interior integrado à vila: moradores reais, rotina e vida (E32)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
Depois do E31 (interiores mobiliados + povoados), o feedback foi que a população
do interior eram **cópias efêmeras**: dava pra "encontrar o mesmo morador dentro e
fora ao mesmo tempo". O pedido: quem está no interior tem que **existir de verdade
na vila**, aparecer lá dentro **conforme a rotina**, **nunca em dois lugares**, e
manter **IA** (comer/beber, ir embora, chegar gente nova). Também: gesto leve de
comer/beber e decoração variando por **tipo de casa**.

## Decisão
1. **Reuso do morador real (check-out/check-in)** — `SettlementManager` ganhou
   `residentPool(theme)`, `checkoutResident` e `checkinResident`. Ao entrar num
   interior, os assentos do `_layout` são preenchidos com as **entidades reais**
   dos aldeões daquela vila: a posição no mundo é guardada, o morador é marcado
   `indoor` (o `_wander` passa a ignorá-lo → **some da multidão externa**) e é
   plantado no lugar. Na saída (ou no rodízio), volta à vila intacto. Como só se
   está dentro OU fora, e o de dentro é a mesma entidade, **ninguém fica em dois
   lugares**.
2. **Escolha por rotina** — `residentPool` anota o objetivo atual (`routineGoal`)
   de cada um; o interior prioriza quem a rotina já poria ali: salão à noite puxa
   quem tem objetivo `hall`, a loja de dia puxa `work`, etc.
3. **Vida dentro (IA + rodízio)** — `InteriorManager._interiorTick`: comensais
   têm gesto ocioso (novo `idleGesture` em `animation.ts`: mão à boca pra comer/
   beber, braço à frente pra servir). De tempos em tempos um levanta e **caminha
   até a porta e sai** (morador real volta pra vila); um assento vago **chama
   outro morador**, que entra pela porta e senta — gente vai e vem.
4. **Fallback sem vila** — sem `SettlementManager` (testes/edge), cai em
   figurantes efêmeros (E31), destruídos na saída.
5. **Decoração por tipo de casa** — além do sotaque da vila, cada ofício marca a
   loja: rack de lâminas/bigorna (armas), manequim (armadura), canteiros/sementes
   (jardineiro), banca de quitutes (comida), fardos e ânforas (mercado geral).

## Consequências
- O interior virou uma **janela para a vila viva**: os que estão dentro são os
  moradores reais, coerentes com a rotina, e a sala respira (comer, sair, chegar).
- Sem duplicata: `indoor` remove o morador do overworld enquanto ele está dentro;
  save/load não persiste posição de aldeão (regeneram na carga), então não há
  estado preso.
- Travado por testes (`interiors.test`: ocupantes são moradores reais da vila e
  `indoor`; `_wander` os ignora; a saída os devolve à posição no mundo). 357
  testes verdes, `tsc` limpo, `vite build` ok. Verificado em runtime: salão de
  Cinzafolha com 6 lenhadores reais (visuais variados) comendo; taverna da
  Clareira com taverneira + cozinheiro + 3 moradores.
