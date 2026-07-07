# ADR 0162 — Correções do playtest: forma inicial, interior, proficiência, menu (E29)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
Playtest apontou quatro problemas:
1. O jogador **já começava com a forma de Lobo** — deveria vir só do santuário.
2. Ao **entrar num interior**, ficava preso num quadradinho, sem andar nem sair.
3. **Atacar o vazio já fazia "evoluir"** — a proficiência subia sem acertar nada.
4. Faltava um **botão de voltar ao menu inicial** na pausa.

## Decisão
1. **Forma inicial** (`Game.setupNewPlayer`): `form.list = ['humanoid']` (era
   `['humanoid','wolf']`). As Formas Ancestrais entram ao despertar seu santuário
   (`story.unlockForm` → `seedForms`), como manda o ADR 0106.
2. **Colisores do interior** (`InteriorManager._buildRoom`): cada parede era **um
   colisor circular de raio = metade do comprimento** (= `ROOM_R` = 8), que
   enchia a sala e prendia o jogador. Trocado por uma **fileira de colisores
   pequenos** (raio 0.7, espaçados ~1.2) ao longo de cada parede — barreira real
   sem tapar o interior.
3. **Proficiência ao acertar** (`playerControl` → `gameEvents`): removido o ganho
   por golpe; agora acumula no evento `damage` quando um **jogador atinge um
   alvo não-jogador**. Golpe no ar não conta.
4. **Menu inicial na pausa** (`Menus`): botão "🏠 Menu inicial" que salva e
   recarrega para o menu principal.

## Consequências
- Início coerente com a campanha (sem Lobo de graça); interiores navegáveis;
  proficiência só premia acerto; saída para o menu a um clique.
- Travado por testes (`bugfixes.test`: forma inicial só humanoide; golpe no ar
  sem proficiência; colisores do interior pequenos) + `world-gameplay` ajustado
  para destravar o Lobo antes de trocar. 350 testes verdes.
