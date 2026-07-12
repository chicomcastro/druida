# ADR 0183 — Combate empolgante: refúgio, combo e golpes variados (E60)

**Status:** Aceito · **Data:** 2026-07-12

## Contexto
Playtest depois do #207 (E58/E59 ok — golpe na direção certa, flash isolado, tela
calma). Novos pontos:

1. **"Subo de nível parado na cidade, atacando o nada, até uns 4."** — investigado
   a fundo: XP é **só por morte de inimigo** (fauna excluída — reprovas headless
   confirmam 0 XP parado 5 min quando nada morre). O que sobra: inimigos
   **assediam o hub inicial** (spawnam a 18–26u e alguns entram na aggro),
   morrendo nos golpes ociosos — a Clareira não era um refúgio de verdade.
2. **Combo trava em ×8** e **quebra fácil** ao errar o timing (zerava de vez).
3. **Animação de ataque pobre** (uma estocada só) — o jogador quer que acertar
   combo seja **empolgante**, com golpes variados.

## Decisão
- **Refúgio (IA):** inimigos não perseguem quem está numa **zona segura**
  (`settlements.isSafe`) — a vila inicial e as demais viram abrigo; os bichos
  rondam a borda em vez de invadir. Some o "sobe de nível parado na cidade"; a
  caçada no mundo aberto não muda. (Somado ao `xpBase 38→64` do #207, a
  progressão inicial deixa de disparar.)
- **Combo:** a **contagem** sobe até `cap 40` (streak alto = empolgante), mas o
  **bônus de dano satura em `dmgCap 8`** (`+96%`, o teto de balanceamento de
  antes — nada muda no dano). Janela alargada (0.56–0.94) e **errar não zera
  mais**: mantém metade do combo (`missKeepFrac`), renova a graça e só cobra um
  respiro — sem adiantar o golpe (não dá pra mashar e furar a cadência).
- **Golpes variados (animação):** cada swing alterna a pose — **machadada de
  cima**, **corte horizontal** (dois sentidos, espelhados, com giro de tronco) e
  **estocada** (investida do corpo). A amplitude **escala com o combo**
  (`flair`), e a VFX do arco fica maior/mais brilhante e alterna o lado da
  varredura conforme o streak sobe (mais faíscas no combo alto).

## Consequências
- Cidade é refúgio; combo empolga (sobe alto, perdoa deslizes, sem estourar
  dano); atacar deixa de ser uma pose única.
- Travado por testes: `aiSafeZone.test` (persegue fora / ignora dentro),
  `combo.test` (dano satura em `dmgCap`, contagem vai além) e `combatFeel.test`
  (cada `attackKind` gera pose distinta; combo alto amplia o golpe).
- 425 testes verdes, `tsc` limpo, `vite build` ok, bundle 230 kB (< 236).

## Futuro
Golpe **finalizador** em marcos de combo (ex.: a cada 10, um giro em área com
VFX próprio); mira assistida suave no melee; sons de golpe variando com a pose.
