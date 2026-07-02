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
    ],
  },
  {
    id: 'vau_palafitas',
    name: 'Vau das Palafitas',
    tagline: 'vila dos coletores de seiva',
    theme: 'palafitas',
    biome: 'pantano',
    x: 62,
    z: -48,
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
    ],
  },
  {
    id: 'cinzafolha',
    name: 'Cinzafolha',
    tagline: 'vila dos lenhadores',
    theme: 'lenhadores',
    biome: 'bosque_cinza',
    x: -128,
    z: 30,
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
    ],
  },
  {
    id: 'abrigo_degelo',
    name: 'Abrigo do Degelo',
    tagline: 'refúgio dos montanheses',
    theme: 'degelo',
    biome: 'picos',
    x: 120,
    z: 140,
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
        x: 8,
        z: 7,
        lines: [
          'Neve: Eu marco a trilha até a borda do Coração. Depois dos últimos cairns, nem eu sigo.',
          'Neve: Lá embaixo as árvores têm olhos, Druida. Vá com todas as Formas que conseguir despertar.',
        ],
      },
    ],
  },
];
