/**
 * Assentamentos temáticos do mundo: uma cidade-vila por região/nível, cada uma
 * com identidade visual própria e habitantes que aprofundam a história da
 * campanha (a corrupção do Apodrecedor e como cada povo resiste a ela).
 * Os layouts são construídos por tema em world/SettlementManager.
 * Ver docs/adr/0041-assentamentos-tematicos.md.
 */

export interface VillagerDef {
  name: string;
  /** Posição local (relativa ao centro do assentamento). */
  x: number;
  z: number;
  lines: string[];
  elder?: boolean;
}

/** Missão local da vila, dada pelo ancião (ADR 0047). */
export interface SettlementQuest {
  id: string;
  title: string;
  kind: 'collect' | 'hunt' | 'elite';
  count: number;
  /** Raio (a partir do centro da vila) onde os objetivos aparecem. */
  radius: number;
  offer: string[];
  remind: string;
  done: string[];
  reward: { essence: number; artifactName: string; ability: string };
}

export interface SettlementDef {
  id: string;
  name: string;
  tagline: string;
  theme: 'druida' | 'palafitas' | 'lenhadores' | 'degelo';
  biome: string;
  x: number;
  z: number;
  radius: number;
  mapColor: string;
  /** Diálogo exibido na primeira chegada (worldbuilding). */
  arrival: string[];
  villagers: VillagerDef[];
  /** Posição local do mercador regional (ADR 0047); o hub usa o dos landmarks. */
  merchant?: { x: number; z: number };
  quest?: SettlementQuest;
}

export const SETTLEMENTS: SettlementDef[] = [
  {
    id: 'circulo_carvalho',
    name: 'Círculo do Carvalho',
    tagline: 'a vila dos druidas',
    theme: 'druida',
    biome: 'clareira',
    x: 0,
    z: 0,
    radius: 26,
    mapColor: '#6cba5a',
    arrival: [
      'Círculo do Carvalho — a última vila dos druidas, erguida ao redor da Carvalho-Mãe.',
      'Cabanas de teto vivo, jardins de ervas e lanternas de vagalumes mantêm a podridão do lado de fora.',
    ],
    villagers: [
      {
        name: 'Herborista Malva',
        x: -5,
        z: 5.5,
        lines: [
          'Malva: Estas ervas só crescem onde a Carvalho-Mãe alcança. Fora do Círculo, tudo azeda.',
          'Malva: A Seiva é a memória da floresta. Quando você a gasta, ela lembra de você.',
          'Malva: Se encontrar folhas pretas no caminho, não pise. A podridão sobe pelas raízes.',
        ],
      },
      {
        name: 'Aprendiz Fen',
        x: 3.5,
        z: -1,
        lines: [
          'Fen: Você é… o Druida que dormia? A Guardiã disse que você viria antes do fim.',
          'Fen: Eu ainda não ouço o Bosque. Dizem que as Formas Ancestrais são o Bosque sonhando alto.',
        ],
      },
      {
        name: 'Vigia Ruda',
        x: -1.5,
        z: -17.5,
        lines: [
          'Ruda: Além dos menires começa o Pântano. À noite dá pra ouvir a Árvore-Carniça ranger.',
          'Ruda: Os coletores do Vau das Palafitas ainda resistem lá. Leve notícias nossas, se chegar.',
        ],
      },
      {
        name: 'Ferreiro-de-Raízes Cedro',
        x: 11,
        z: 1,
        lines: [
          'Cedro: Eu não forjo ferro — eu convenço a madeira. Cabo bom é o que ainda lembra de ser galho.',
          'Cedro: Se a sua arma rachar, traga aqui. Raiz viva emenda melhor que prego.',
        ],
      },
      {
        name: 'Tecelã Urze',
        x: -11,
        z: 2,
        lines: [
          'Urze: Cada telhado desta vila passou pelo meu tear. Musgo por cima, oração por baixo.',
          'Urze: Teço com fibra de junco do Vau. Quando o comércio parar, a vila fica descoberta — em todo sentido.',
        ],
      },
      {
        name: 'Velho Sabugo',
        x: 3,
        z: 8,
        lines: [
          'Sabugo: Eu era vigia quando a Carvalho-Mãe ainda cabia num abraço. Hoje só vigio a fogueira.',
          'Sabugo: Sente o cheiro? Fumaça de lenha limpa. Enquanto durar esse cheiro, a vila está de pé.',
        ],
      },
    ],
  },
  {
    id: 'vau_palafitas',
    name: 'Vau das Palafitas',
    tagline: 'vila dos coletores de seiva',
    theme: 'palafitas',
    biome: 'pantano',
    x: 180,
    z: -120,
    radius: 20,
    mapColor: '#8fb04a',
    arrival: [
      'Vau das Palafitas — casas sobre estacas na água escura, ligadas por passarelas de tábua.',
      'Os coletores filtram a seiva do pântano com raízes vivas; suas lanternas de musgo afastam a Corrupção.',
    ],
    villagers: [
      {
        name: 'Velha Juncia',
        x: 0,
        z: 1.5,
        elder: true,
        lines: [
          'Juncia: Eu vi O Apodrecedor quando ele ainda tinha nome de gente. Passou por este vau, chorando pela floresta.',
          'Juncia: Ele quis trancar a morte pra fora — e trancou a vida junto. O que não morre, apodrece.',
          'Juncia: O Santuário do Urso fica a oeste daqui, no fundo do brejo. O Urso resiste; você vai precisar disso.',
          'Juncia: E cuidado com a Árvore-Carniça. Ela já foi a árvore mais bonita do pântano.',
        ],
      },
      {
        name: 'Pescador Barbo',
        x: 8,
        z: -9,
        lines: [
          'Barbo: Os peixes de barbatana preta a gente devolve. Peixe que não morre não é peixe, é praga.',
          'Barbo: A água era clara quando meu pai fincou a primeira estaca. Hoje só as lanternas de musgo a mantêm viva.',
        ],
      },
      {
        name: 'Coletora Íris',
        x: -9,
        z: -6,
        lines: [
          'Íris: A seiva boa desce da Clareira. A ruim sobe do Coração. No meio, a gente filtra.',
          'Íris: Se as suas botas afundarem no lodo, ande pelas passarelas. O pântano engole quem tem pressa.',
        ],
      },
      {
        name: 'Tecelão Junco',
        x: 0,
        z: 4,
        lines: [
          'Junco: Passarela solta mata mais que Casca Oca. Eu amarro cada tábua três vezes.',
          'Junco: A Urze do Carvalho compra minha fibra. Se vir a tecelã, diga que o junco deste ano veio forte.',
        ],
      },
      {
        name: 'Curandeira Lentilha',
        x: 9,
        z: -2,
        lines: [
          'Lentilha: Febre do brejo se cura com lodo quente e paciência. Corrupção, só com o que você carrega aí.',
          'Lentilha: Beba água só das lanternas de musgo. O resto deste pântano é chá de podridão.',
        ],
      },
    ],
    merchant: { x: -3, z: -10 },
    quest: {
      id: 'q_vau',
      title: 'Flores-de-lodo',
      kind: 'collect',
      count: 3,
      radius: 22,
      offer: [
        'Juncia: Druida… as flores-de-lodo só abrem onde a água ainda resiste. Minhas pernas não alcançam mais o brejo.',
        'Juncia: Traga 3 delas e eu prendo a luz do musgo numa lanterna pra você.',
      ],
      remind: 'Juncia: As flores brilham verde-água no brejo ao redor do vau. Faltam {n}.',
      done: [
        'Juncia: Ainda cheiram a água limpa… Obrigada, Druida.',
        'Juncia: Tome — a Lanterna de Musgo. A luz dela cura o que a podridão morde.',
      ],
      reward: { essence: 40, artifactName: 'Lanterna de Musgo', ability: 'healing_totem' },
    },
  },
  {
    id: 'cinzafolha',
    name: 'Cinzafolha',
    tagline: 'vila dos lenhadores',
    theme: 'lenhadores',
    biome: 'bosque_cinza',
    x: -235,
    z: 58,
    radius: 20,
    mapColor: '#c8a06a',
    arrival: [
      'Cinzafolha — uma paliçada de troncos no meio do Bosque Cinza, coberta pela cinza dos fornos.',
      'Os lenhadores cortam e queimam a madeira corrompida antes que ela caminhe. É um trabalho sem fim.',
    ],
    villagers: [
      {
        name: 'Mestre-Forno Baru',
        x: 0,
        z: -3,
        elder: true,
        lines: [
          'Baru: Todo tronco doente vira carvão nos meus fornos. Cinza não apodrece — por isso a vila tem esse nome.',
          'Baru: O Bosque era verde, Druida. Ficou cinza de tanto a gente queimar pra ele não virar outra coisa.',
          'Baru: O Santuário do Corvo está mais ao sul, entre as árvores mortas. O Corvo vê o que a fumaça esconde.',
          'Baru: Se um dia meus fornos apagarem, não venha procurar a vila. Procure um chefe novo pro Apodrecedor.',
        ],
      },
      {
        name: 'Lenhadora Telha',
        x: 9,
        z: 6,
        lines: [
          'Telha: Machado afiado corta árvore corrompida como qualquer outra. O difícil é quando ela corta de volta.',
          'Telha: A gente derruba as que sangram seiva preta primeiro. Você reconhece pelo cheiro doce. Doce demais.',
        ],
      },
      {
        name: 'Carvoeiro Fuligem',
        x: -8,
        z: 8,
        lines: [
          'Fuligem: Os braseiros ficam acesos a noite toda. A Corrupção tem medo de brasa, não de fogo.',
          'Fuligem: Dizem que nos Picos existe uma chama que queima azul e nunca apaga. Queria ver isso antes do fim.',
        ],
      },
      {
        name: 'Serrador Nó',
        x: 5,
        z: 6,
        lines: [
          'Nó: A serraria come um tronco por dia. Madeira corrompida a gente corta primeiro e queima depois — nessa ordem.',
          'Nó: Ouça a lâmina: quando ela canta limpo, a tora é boa. Quando engasga… afaste-se.',
        ],
      },
      {
        name: 'Guarda-Brasas Cinza',
        x: -4,
        z: -2,
        lines: [
          'Cinza: Meu trabalho é simples: nenhum braseiro apaga no meu turno. Nenhum. Nunca.',
          'Cinza: O Baru fala dos fornos, mas são os braseiros que seguram a noite. Pode agradecer depois.',
        ],
      },
    ],
    merchant: { x: 3, z: -10 },
    quest: {
      id: 'q_cinza',
      title: 'Foco de corrupção',
      kind: 'hunt',
      count: 6,
      radius: 24,
      offer: [
        'Baru: Tem um foco de corrupção crescendo fora da paliçada. Meus lenhadores cortam árvore, não bicho.',
        'Baru: Derrube 6 dessas criaturas antes que elas derrubem meus fornos.',
      ],
      remind: 'Baru: Ainda ouço a podridão rondando a paliçada. Faltam {n}.',
      done: [
        'Baru: A fumaça subiu reta hoje. É sinal de paz, Druida.',
        'Baru: Leve esta Brasa de Cinzafolha — carvão dos meus fornos que nunca esfria.',
      ],
      reward: { essence: 50, artifactName: 'Brasa de Cinzafolha', ability: 'wildfire' },
    },
  },
  {
    id: 'abrigo_degelo',
    name: 'Abrigo do Degelo',
    tagline: 'refúgio dos montanheses',
    theme: 'degelo',
    biome: 'picos',
    x: 175,
    z: 206,
    radius: 18,
    mapColor: '#9fdcff',
    arrival: [
      'Abrigo do Degelo — tendas de pele e marcos de pedra agarrados à encosta gelada.',
      'Os montanheses guardam os cairns da trilha antiga: o único caminho seguro até o Coração Corrompido.',
    ],
    villagers: [
      {
        name: 'Sira do Degelo',
        x: 0,
        z: 2,
        elder: true,
        lines: [
          'Sira: Nossos ancestrais empilharam esses cairns quando o Coração ainda era uma semente sagrada.',
          'Sira: A trilha antiga desce dos Picos direto até ele. Nós a mantivemos limpa… esperando um Druida.',
          'Sira: O Santuário do Sapo dorme no gelo, ao sul. O Sapo escuta a água — até a água presa no gelo.',
          'Sira: A chama azul do nosso fogo não aquece, mas também não apodrece. Aqui em cima, é o bastante.',
        ],
      },
      {
        name: 'Pastor Cardo',
        x: -8,
        z: -5,
        lines: [
          'Cardo: O rebanho não desce mais a encosta. Os bichos sentem a podridão antes da gente.',
          'Cardo: Quando o vento sopra do Coração, até a neve cai suja. Você veio pra limpar isso, não veio?',
        ],
      },
      {
        name: 'Batedora Neve',
        x: 11,
        z: 4,
        lines: [
          'Neve: Eu marco a trilha até a borda do Coração. Depois dos últimos cairns, nem eu sigo.',
          'Neve: Lá embaixo as árvores têm olhos, Druida. Vá com todas as Formas que conseguir despertar.',
        ],
      },
      {
        name: 'Escavador Sílex',
        x: -8,
        z: -3,
        lines: [
          'Sílex: Cavo abrigo no gelo desde menino. O truque é escutar: gelo bom range, gelo ruim silencia.',
          'Sílex: Achei uma parede azul lisa demais pra ser natural, lá na encosta. Não cavei mais fundo. Nem vou.',
        ],
      },
      {
        name: 'Guia Bruma',
        x: 3,
        z: 11,
        lines: [
          'Bruma: Eu levo caravanas até Cinzafolha quando o tempo abre. O tempo não abre há semanas.',
          'Bruma: Se a nevasca te pegar, procure os cairns. Cada pilha de pedra é alguém que chegou vivo.',
        ],
      },
    ],
    merchant: { x: 5, z: -10 },
    quest: {
      id: 'q_degelo',
      title: 'O Gelo-Antigo',
      kind: 'elite',
      count: 1,
      radius: 22,
      offer: [
        'Sira: Uma coisa velha acordou no gelo — uma Casca Oca que o frio endureceu como pedra. Derrubou dois cairns.',
        'Sira: Nós a chamamos de Gelo-Antigo. Se os cairns caírem, a trilha ao Coração se perde. Cace-a.',
      ],
      remind: 'Sira: O Gelo-Antigo ronda a encosta, perto dos cairns caídos. Cuidado: a casca dele é pedra.',
      done: [
        'Sira: Os cairns estão de pé outra vez. A montanha lembra do que você fez.',
        'Sira: Esta Lasca do Degelo caiu do corpo dele. O frio dela morde por você agora.',
      ],
      reward: { essence: 60, artifactName: 'Lasca do Degelo', ability: 'ice_lance' },
    },
  },
];
