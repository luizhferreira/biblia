import { loadJson, type DataBook } from "./dataFetch";

export interface Verse {
  verse: number;
  text: string;
}

/**
 * Available parallel columns.
 * "pt" = Matos Soares · "av" = Ave-Maria
 * "la" = Vulgata Clementina · "en" = King James
 *
 * Todas as quatro traduções são servidas de `public/data/{lang}/{file}.json`,
 * geradas por `scripts/build-data.ts`. A Vulgata e a KJV, antes buscadas em
 * runtime na getbible.net, agora vêm empacotadas como o resto.
 */
export type Lang = "la" | "pt" | "en" | "av";

/**
 * Load a chapter of a bundled translation from `public/data/{lang}/{file}.json`.
 * `file` is the book filename without extension (e.g. "gn", "1sm"). Devolve
 * lista vazia quando a tradução não cobre aquele livro/capítulo (ex.: a KJV não
 * tem os deuterocanônicos) — ausência é estado normal, não erro.
 */
export async function fetchLocalChapter(
  file: string,
  chapter: number,
  lang: Exclude<Lang, "av"> = "pt",
): Promise<Verse[]> {
  const book = await loadJson<DataBook>(`${lang}/${file}.json`);
  if (!book) return [];

  return (book[String(chapter)] ?? []).map((v) => ({ verse: v.v, text: v.t }));
}

export type ParallelRow = { verse: number } & Partial<Record<Lang, string>>;

/**
 * Merge verse lists (keyed by language) into aligned rows by verse number.
 * Any subset of languages may be provided.
 */
export function mergeVerses(cols: Partial<Record<Lang, Verse[]>>): ParallelRow[] {
  const map = new Map<number, ParallelRow>();
  for (const [lang, verses] of Object.entries(cols) as [Lang, Verse[]][]) {
    for (const v of verses) {
      const row = map.get(v.verse) ?? { verse: v.verse };
      row[lang] = v.text;
      map.set(v.verse, row);
    }
  }
  return [...map.values()].sort((a, b) => a.verse - b.verse);
}
