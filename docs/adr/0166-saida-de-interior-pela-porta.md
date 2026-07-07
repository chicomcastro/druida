# ADR 0166 — Saída de interior pela porta: continuidade de movimento (E33)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
No E32 o morador do interior era a entidade real da vila, mas ao ser liberado
(rodízio ou saída do jogador) ele **voltava direto pra posição antiga** —
parecia teleporte. O pedido: a integração tem que ser **rotina de movimento**.
Quem sai pela porta do interior deve **aparecer na porta do lado de fora** e
seguir andando pela cidade, como se estivesse se movimentando pelo cenário — não
sumir de dentro e reaparecer num ponto aleatório.

## Decisão
1. **Emergência pela porta** (`SettlementManager.checkinResident(rec, door)`): ao
   liberar um morador de um interior, se há uma porta (a porta externa por onde se
   entrou, `active.returnPos`), ele **não** reaparece na posição antiga. Fica
   **escondido** (`object3d.visible = false`, ainda `indoor`) e entra numa fila
   `_emerging`.
2. **Fila escalonada** (`_emergeTick`, roda no overworld — não durante o interior):
   cada um **emerge na porta** (com leve dispersão determinística), volta a ser
   visível, limpa o `indoor` e recebe `target = null` → o `_wander` escolhe o
   próximo objetivo da rotina e ele **caminha pela vila**. O escalonamento (~0.55s
   entre um e outro) faz o povo **sair aos poucos**, não todos de uma vez.
3. **Vale para os dois casos**: rodízio (alguém se levanta e sai no meio da visita)
   e saída do jogador (os que estavam dentro saem pela porta atrás dele). Como o
   `_emergeTick` só roda com o overworld ativo, durante a visita eles ficam
   escondidos e só aparecem lá fora quando o mundo volta.

## Consequências
- A porta virou uma **transição de verdade**: dá pra ver os moradores saindo do
  prédio e indo embora pela cidade, coerente com a rotina — fim do "reaparece do
  nada". Junto com o E32 (entra quem a rotina põe ali; some da multidão enquanto
  dentro), o interior é uma janela contínua da vila viva.
- Save/load não persiste posição de aldeão (regeneram na carga), então a fila de
  emergência não deixa estado preso.
- Travado por testes (`interiors.test`: ao sair, o morador fica escondido e
  pendente, depois **emerge na porta** — visível, perto da porta, `indoor` limpo;
  o rodízio drena a fila sem deixar ninguém preso). 358 testes verdes, `tsc`
  limpo, `vite build` ok. Verificado em runtime (enter→exit→moradores emergem
  visíveis na porta e andam pela vila; sem erros).

## Futuro
Modelo de ocupação persistente: aldeões entrando em prédios sozinhos (fora da
presença do jogador) por rotina, ficando "dentro" por um tempo e saindo pela
porta — hoje a entrada nos interiores ainda parte da visita do jogador.
