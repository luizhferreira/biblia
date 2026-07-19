/* ── Ordinário da Missa ───────────────────────────────────────
 * Partes fixas da celebração, conforme o Missal Romano,
 * 3ª Edição Típica (tradução da CNBB, 2023).
 * As partes próprias do dia (leituras, orações, antífonas)
 * vêm da API em ../lib/liturgiaApi.ts.
 *
 * Vozes:  P = presidente/sacerdote · T = todos (assembleia) · R = rubrica
 */

export type Voz = "P" | "T" | "R";

export interface Linha {
  voz: Voz;
  texto: string;
}

export interface Forma {
  label: string;
  linhas: Linha[];
}

export interface Parte {
  id: string;
  titulo: string;
  nota?: string;
  formas: Forma[];
}

export interface OracaoEucaristica {
  id: string;
  titulo: string;
  subtitulo?: string;
  nota?: string;
  linhas: Linha[];
}

/* ═══════════════ RITOS INICIAIS ═══════════════ */

export const SINAL_DA_CRUZ: Parte = {
  id: "sinal",
  titulo: "Sinal da Cruz",
  formas: [
    {
      label: "Forma única",
      linhas: [
        { voz: "P", texto: "Em nome do Pai e do Filho e do Espírito Santo." },
        { voz: "T", texto: "Amém." },
      ],
    },
  ],
};

export const SAUDACAO: Parte = {
  id: "saudacao",
  titulo: "Saudação",
  nota: "O sacerdote escolhe uma das fórmulas.",
  formas: [
    {
      label: "1ª fórmula",
      linhas: [
        {
          voz: "P",
          texto:
            "A graça de nosso Senhor Jesus Cristo, o amor do Pai e a comunhão do Espírito Santo estejam convosco.",
        },
        { voz: "T", texto: "Bendito seja Deus, que nos reuniu no amor de Cristo." },
      ],
    },
    {
      label: "2ª fórmula",
      linhas: [
        {
          voz: "P",
          texto:
            "A graça e a paz de Deus, nosso Pai, e de Jesus Cristo, nosso Senhor, estejam convosco.",
        },
        { voz: "T", texto: "Bendito seja Deus, que nos reuniu no amor de Cristo." },
      ],
    },
    {
      label: "3ª fórmula",
      linhas: [
        { voz: "P", texto: "O Senhor esteja convosco." },
        { voz: "T", texto: "Ele está no meio de nós." },
      ],
    },
  ],
};

export const ATO_PENITENCIAL: Parte = {
  id: "penitencial",
  titulo: "Ato Penitencial",
  nota: "O sacerdote convida ao arrependimento; segue-se um momento de silêncio e uma das fórmulas.",
  formas: [
    {
      label: "1ª fórmula (Confesso)",
      linhas: [
        {
          voz: "R",
          texto:
            "Irmãos e irmãs, reconheçamos os nossos pecados, para celebrarmos dignamente os santos mistérios.",
        },
        {
          voz: "T",
          texto:
            "Confesso a Deus todo-poderoso e a vós, irmãos e irmãs, que pequei muitas vezes por pensamentos e palavras, atos e omissões, por minha culpa, minha culpa, minha tão grande culpa. E peço à Virgem Maria, aos Anjos e Santos e a vós, irmãos e irmãs, que rogueis por mim a Deus, nosso Senhor.",
        },
        {
          voz: "P",
          texto:
            "Deus todo-poderoso tenha compaixão de nós, perdoe os nossos pecados e nos conduza à vida eterna.",
        },
        { voz: "T", texto: "Amém." },
      ],
    },
    {
      label: "2ª fórmula",
      linhas: [
        { voz: "P", texto: "Tende compaixão de nós, Senhor." },
        { voz: "T", texto: "Porque somos pecadores." },
        { voz: "P", texto: "Manifestai, Senhor, a vossa misericórdia." },
        { voz: "T", texto: "E dai-nos a vossa salvação." },
        {
          voz: "P",
          texto:
            "Deus todo-poderoso tenha compaixão de nós, perdoe os nossos pecados e nos conduza à vida eterna.",
        },
        { voz: "T", texto: "Amém." },
      ],
    },
    {
      label: "3ª fórmula (com invocações)",
      linhas: [
        {
          voz: "P",
          texto:
            "Senhor, que viestes salvar os corações arrependidos, tende piedade de nós.",
        },
        { voz: "T", texto: "Senhor, tende piedade de nós." },
        {
          voz: "P",
          texto: "Cristo, que viestes chamar os pecadores, tende piedade de nós.",
        },
        { voz: "T", texto: "Cristo, tende piedade de nós." },
        {
          voz: "P",
          texto:
            "Senhor, que intercedeis por nós junto do Pai, tende piedade de nós.",
        },
        { voz: "T", texto: "Senhor, tende piedade de nós." },
        {
          voz: "P",
          texto:
            "Deus todo-poderoso tenha compaixão de nós, perdoe os nossos pecados e nos conduza à vida eterna.",
        },
        { voz: "T", texto: "Amém." },
      ],
    },
  ],
};

export const KYRIE: Parte = {
  id: "kyrie",
  titulo: "Senhor, tende piedade (Kyrie)",
  nota: "Segue-se ao Ato Penitencial, quando não incluído nele.",
  formas: [
    {
      label: "Português",
      linhas: [
        { voz: "P", texto: "Senhor, tende piedade de nós." },
        { voz: "T", texto: "Senhor, tende piedade de nós." },
        { voz: "P", texto: "Cristo, tende piedade de nós." },
        { voz: "T", texto: "Cristo, tende piedade de nós." },
        { voz: "P", texto: "Senhor, tende piedade de nós." },
        { voz: "T", texto: "Senhor, tende piedade de nós." },
      ],
    },
    {
      label: "Grego",
      linhas: [
        { voz: "P", texto: "Kýrie, eléison." },
        { voz: "T", texto: "Kýrie, eléison." },
        { voz: "P", texto: "Christe, eléison." },
        { voz: "T", texto: "Christe, eléison." },
        { voz: "P", texto: "Kýrie, eléison." },
        { voz: "T", texto: "Kýrie, eléison." },
      ],
    },
  ],
};

export const GLORIA: Parte = {
  id: "gloria",
  titulo: "Glória",
  nota: "Canta-se ou recita-se aos domingos (exceto Advento e Quaresma), solenidades e festas.",
  formas: [
    {
      label: "Hino",
      linhas: [
        {
          voz: "T",
          texto:
            "Glória a Deus nas alturas, e paz na terra aos homens por Ele amados. Senhor Deus, Rei dos céus, Deus Pai todo-poderoso, nós vos louvamos, nós vos bendizemos, nós vos adoramos, nós vos glorificamos, nós vos damos graças por vossa imensa glória. Senhor Jesus Cristo, Filho Unigênito, Senhor Deus, Cordeiro de Deus, Filho de Deus Pai: vós, que tirais o pecado do mundo, tende piedade de nós; vós, que tirais o pecado do mundo, acolhei a nossa súplica; vós, que estais à direita do Pai, tende piedade de nós. Só vós sois o Santo; só vós, o Senhor; só vós, o Altíssimo, Jesus Cristo, com o Espírito Santo, na glória de Deus Pai. Amém.",
        },
      ],
    },
  ],
};
