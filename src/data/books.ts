export type Testament = "AT" | "NT";

export interface BookDef {
  /** getbible.net book number (Vulgata Clementina) */
  nr: number;
  /** filename (without .json) in biblia-db-main (tradução Matos Soares) */
  file: string;
  /**
   * Slug canônico em português para a URL do capítulo (`/{slug}/{capítulo}`).
   * É a chave pública de SEO — uma vez indexado, NÃO deve mudar.
   */
  slug: string;
  /** Portuguese display name */
  pt: string;
  /** Latin display name (Vulgata) */
  la: string;
  chapters: number;
  testament: Testament;
}

// Cânon católico completo (73 livros), na ordem da Vulgata /
// tradução do Pe. Matos Soares.
export const BOOKS: BookDef[] = [
  // ── Vetus Testamentum ─────────────────────────────
  { nr: 1, file: "gn", slug: "genesis", pt: "Gênesis", la: "Genesis", chapters: 50, testament: "AT" },
  { nr: 2, file: "ex", slug: "exodo", pt: "Êxodo", la: "Exodus", chapters: 40, testament: "AT" },
  { nr: 3, file: "lv", slug: "levitico", pt: "Levítico", la: "Leviticus", chapters: 27, testament: "AT" },
  { nr: 4, file: "nm", slug: "numeros", pt: "Números", la: "Numeri", chapters: 36, testament: "AT" },
  { nr: 5, file: "dt", slug: "deuteronomio", pt: "Deuteronômio", la: "Deuteronomium", chapters: 34, testament: "AT" },
  { nr: 6, file: "js", slug: "josue", pt: "Josué", la: "Iosue", chapters: 24, testament: "AT" },
  { nr: 7, file: "ju", slug: "juizes", pt: "Juízes", la: "Iudicum", chapters: 21, testament: "AT" },
  { nr: 8, file: "rt", slug: "rute", pt: "Rute", la: "Ruth", chapters: 4, testament: "AT" },
  { nr: 9, file: "1sm", slug: "1-samuel", pt: "1 Samuel", la: "I Samuelis", chapters: 31, testament: "AT" },
  { nr: 10, file: "2sm", slug: "2-samuel", pt: "2 Samuel", la: "II Samuelis", chapters: 24, testament: "AT" },
  { nr: 11, file: "1rs", slug: "1-reis", pt: "1 Reis", la: "I Regum", chapters: 22, testament: "AT" },
  { nr: 12, file: "2rs", slug: "2-reis", pt: "2 Reis", la: "II Regum", chapters: 25, testament: "AT" },
  { nr: 13, file: "1pa", slug: "1-cronicas", pt: "1 Crônicas", la: "I Paralipomenon", chapters: 29, testament: "AT" },
  { nr: 14, file: "2pa", slug: "2-cronicas", pt: "2 Crônicas", la: "II Paralipomenon", chapters: 36, testament: "AT" },
  { nr: 15, file: "esd", slug: "esdras", pt: "Esdras", la: "Esdras", chapters: 10, testament: "AT" },
  { nr: 16, file: "ne", slug: "neemias", pt: "Neemias", la: "Nehemias", chapters: 13, testament: "AT" },
  { nr: 69, file: "tob", slug: "tobias", pt: "Tobias", la: "Tobias", chapters: 14, testament: "AT" },
  { nr: 70, file: "jdi", slug: "judite", pt: "Judite", la: "Iudith", chapters: 16, testament: "AT" },
  { nr: 17, file: "est", slug: "ester", pt: "Ester", la: "Esther", chapters: 16, testament: "AT" },
  { nr: 18, file: "job", slug: "jo", pt: "Jó", la: "Iob", chapters: 42, testament: "AT" },
  { nr: 19, file: "ps", slug: "salmos", pt: "Salmos", la: "Psalmi", chapters: 150, testament: "AT" },
  { nr: 20, file: "pv", slug: "proverbios", pt: "Provérbios", la: "Proverbia", chapters: 31, testament: "AT" },
  { nr: 21, file: "ees", slug: "eclesiastes", pt: "Eclesiastes", la: "Ecclesiastes", chapters: 12, testament: "AT" },
  { nr: 22, file: "cc", slug: "cantico-dos-canticos", pt: "Cântico dos Cânticos", la: "Canticum Canticorum", chapters: 8, testament: "AT" },
  { nr: 73, file: "sa", slug: "sabedoria", pt: "Sabedoria", la: "Sapientia", chapters: 19, testament: "AT" },
  { nr: 74, file: "eus", slug: "eclesiastico", pt: "Eclesiástico", la: "Ecclesiasticus", chapters: 51, testament: "AT" },
  { nr: 23, file: "is", slug: "isaias", pt: "Isaías", la: "Isaias", chapters: 66, testament: "AT" },
  { nr: 24, file: "je", slug: "jeremias", pt: "Jeremias", la: "Ieremias", chapters: 52, testament: "AT" },
  { nr: 25, file: "lm", slug: "lamentacoes", pt: "Lamentações", la: "Lamentationes", chapters: 5, testament: "AT" },
  { nr: 75, file: "ba", slug: "baruc", pt: "Baruc", la: "Baruch", chapters: 6, testament: "AT" },
  { nr: 26, file: "ez", slug: "ezequiel", pt: "Ezequiel", la: "Ezechiel", chapters: 48, testament: "AT" },
  { nr: 27, file: "dn", slug: "daniel", pt: "Daniel", la: "Daniel", chapters: 14, testament: "AT" },
  { nr: 28, file: "os", slug: "oseias", pt: "Oseias", la: "Osee", chapters: 14, testament: "AT" },
  { nr: 29, file: "jl", slug: "joel", pt: "Joel", la: "Ioel", chapters: 3, testament: "AT" },
  { nr: 30, file: "am", slug: "amos", pt: "Amós", la: "Amos", chapters: 9, testament: "AT" },
  { nr: 31, file: "ab", slug: "abdias", pt: "Abdias", la: "Abdias", chapters: 1, testament: "AT" },
  { nr: 32, file: "jn", slug: "jonas", pt: "Jonas", la: "Ionas", chapters: 4, testament: "AT" },
  { nr: 33, file: "mic", slug: "miqueias", pt: "Miqueias", la: "Michaeas", chapters: 7, testament: "AT" },
  { nr: 34, file: "na", slug: "naum", pt: "Naum", la: "Nahum", chapters: 3, testament: "AT" },
  { nr: 35, file: "hc", slug: "habacuque", pt: "Habacuque", la: "Habacuc", chapters: 3, testament: "AT" },
  { nr: 36, file: "so", slug: "sofonias", pt: "Sofonias", la: "Sophonias", chapters: 3, testament: "AT" },
  { nr: 37, file: "ag", slug: "ageu", pt: "Ageu", la: "Aggaeus", chapters: 2, testament: "AT" },
  { nr: 38, file: "zc", slug: "zacarias", pt: "Zacarias", la: "Zacharias", chapters: 14, testament: "AT" },
  { nr: 39, file: "ml", slug: "malaquias", pt: "Malaquias", la: "Malachias", chapters: 4, testament: "AT" },
  { nr: 80, file: "1ma", slug: "1-macabeus", pt: "1 Macabeus", la: "I Maccabaeorum", chapters: 16, testament: "AT" },
  { nr: 81, file: "2ma", slug: "2-macabeus", pt: "2 Macabeus", la: "II Maccabaeorum", chapters: 15, testament: "AT" },
  // ── Novum Testamentum ─────────────────────────────
  { nr: 40, file: "mt", slug: "mateus", pt: "Mateus", la: "Matthaeus", chapters: 28, testament: "NT" },
  { nr: 41, file: "mc", slug: "marcos", pt: "Marcos", la: "Marcus", chapters: 16, testament: "NT" },
  { nr: 42, file: "lc", slug: "lucas", pt: "Lucas", la: "Lucas", chapters: 24, testament: "NT" },
  { nr: 43, file: "jo", slug: "joao", pt: "João", la: "Ioannes", chapters: 21, testament: "NT" },
  { nr: 44, file: "act", slug: "atos", pt: "Atos dos Apóstolos", la: "Actus Apostolorum", chapters: 28, testament: "NT" },
  { nr: 45, file: "rm", slug: "romanos", pt: "Romanos", la: "Ad Romanos", chapters: 16, testament: "NT" },
  { nr: 46, file: "1co", slug: "1-corintios", pt: "1 Coríntios", la: "I ad Corinthios", chapters: 16, testament: "NT" },
  { nr: 47, file: "2co", slug: "2-corintios", pt: "2 Coríntios", la: "II ad Corinthios", chapters: 13, testament: "NT" },
  { nr: 48, file: "gl", slug: "galatas", pt: "Gálatas", la: "Ad Galatas", chapters: 6, testament: "NT" },
  { nr: 49, file: "ef", slug: "efesios", pt: "Efésios", la: "Ad Ephesios", chapters: 6, testament: "NT" },
  { nr: 50, file: "fp", slug: "filipenses", pt: "Filipenses", la: "Ad Philippenses", chapters: 4, testament: "NT" },
  { nr: 51, file: "cl", slug: "colossenses", pt: "Colossenses", la: "Ad Colossenses", chapters: 4, testament: "NT" },
  { nr: 52, file: "1ts", slug: "1-tessalonicenses", pt: "1 Tessalonicenses", la: "I ad Thessalonicenses", chapters: 5, testament: "NT" },
  { nr: 53, file: "2ts", slug: "2-tessalonicenses", pt: "2 Tessalonicenses", la: "II ad Thessalonicenses", chapters: 3, testament: "NT" },
  { nr: 54, file: "1tm", slug: "1-timoteo", pt: "1 Timóteo", la: "I ad Timotheum", chapters: 6, testament: "NT" },
  { nr: 55, file: "2tm", slug: "2-timoteo", pt: "2 Timóteo", la: "II ad Timotheum", chapters: 4, testament: "NT" },
  { nr: 56, file: "tt", slug: "tito", pt: "Tito", la: "Ad Titum", chapters: 3, testament: "NT" },
  { nr: 57, file: "fm", slug: "filemon", pt: "Filêmon", la: "Ad Philemonem", chapters: 1, testament: "NT" },
  { nr: 58, file: "hb", slug: "hebreus", pt: "Hebreus", la: "Ad Hebraeos", chapters: 13, testament: "NT" },
  { nr: 59, file: "tg", slug: "tiago", pt: "Tiago", la: "Iacobi", chapters: 5, testament: "NT" },
  { nr: 60, file: "1pe", slug: "1-pedro", pt: "1 Pedro", la: "I Petri", chapters: 5, testament: "NT" },
  { nr: 61, file: "2pe", slug: "2-pedro", pt: "2 Pedro", la: "II Petri", chapters: 3, testament: "NT" },
  { nr: 62, file: "1jo", slug: "1-joao", pt: "1 João", la: "I Ioannis", chapters: 5, testament: "NT" },
  { nr: 63, file: "2jo", slug: "2-joao", pt: "2 João", la: "II Ioannis", chapters: 1, testament: "NT" },
  { nr: 64, file: "3jo", slug: "3-joao", pt: "3 João", la: "III Ioannis", chapters: 1, testament: "NT" },
  { nr: 65, file: "jda", slug: "judas", pt: "Judas", la: "Iudae", chapters: 1, testament: "NT" },
  { nr: 66, file: "ap", slug: "apocalipse", pt: "Apocalipse", la: "Apocalypsis", chapters: 22, testament: "NT" },
];

/** Índice slug → posição em BOOKS, para resolver rotas em O(1). */
export const BOOK_BY_SLUG: Map<string, number> = new Map(
  BOOKS.map((b, i) => [b.slug, i]),
);
