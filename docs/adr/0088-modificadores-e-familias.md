# ADR 0088 — Modificadores de raridade + famílias de arma (E1)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O roadmap (E1) pede itens com modificadores comum/raro/único que "mudem a
dinâmica do jogo e permitam novos gameplays", e famílias de arma
(machado/foice/garras) como base da especialização (E4).

## Decisão
- **`modifiers.ts`**: pool de afixos data-driven. Cada `ModDef` declara
  tipos válidos, `kind` (`stat` agregada no equip · `behavior` lida
  on-demand) e escala por nível. Raridade define a contagem:
  comum 0, raro 1, único 2 (`RARITY_MODS`).
- **Afixos iniciais**: Potência/Sedento(lifesteal)/Ceifar(cleave)/Cadência
  (tempo) em armas; Baluarte/Vitalidade/Ligeireza/Espinhos em armaduras;
  Manancial/Eco em artefatos.
- **Wiring atual**: stats (Potência→dmg, Vitalidade→hp, Baluarte→mitig,
  Ligeireza→velocidade, Manancial→regen) agregados em `applyEquipment`;
  behaviors Sedento e Espinhos no `applyDamage`. Cadência/Ceifar/Eco ficam
  como dados a serem consumidos pelo E3 (combo) e além — declarados agora
  para o loot já rolá-los.
- **Famílias de arma**: `WeaponFamily = axe | scythe | claws | staff`.
  Machado (dano alto, arco estreito), foice (amplo), garras (rápido), e o
  cajado de conjuração. Cada base declara sua família — o E4 lê para
  proficiência.
- **`sumMod(items, id)`** agrega um afixo em todos os itens equipados;
  `modText` gera a descrição legível (usada nos tooltips da mochila).

## Consequências
- Loot passa a ter identidade de build já no E1; os afixos de comportamento
  restantes são o gancho pronto para os épicos seguintes.
