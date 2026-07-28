import { loadJson, type DataBook } from "./dataFetch";

export interface Verse {
  verse: number;
  text: string;
}

interface ApiVerse {
  chapter: number;
  verse: number;
  text: string;
}

interface ApiResponse {
  verses?: ApiVerse[];
}

const BASE = "https://api.getbible.net/v2";

function clean(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // strip any HTML/OSIS markup
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch a chapter for a given translation from getbible.net.
 * translation: "vulgate" (Vulgata Clementina)
 * Returns a list of verses (empty if unavailable in that version).
 */
export async function fetchChapter(
  bookNr: number,
  chapter: number,
  translation: string,
  signal?: AbortSignal,
): Promise<Verse[]> {
  const url = `${BASE}/${translation}/${bookNr}/${chapter}.json`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Falha ao carregar (${res.status}).`);
  }

  const data: ApiResponse = await res.json();
  if (!data.verses) return [];

  return data.verses
    .map((v) => ({ verse: v.verse, text: clean(v.text) }))
    .filter((v) => v.text.length > 0);
}

/* ── Tradução Matos Soares (arquivos locais em biblia-db-main) ── */

/**
 * Load a chapter of the Matos Soares translation. `scripts/build-data.ts`
 * normaliza os arquivos de `biblia-db-main/` para `public/data/pt/`, de onde
 * cada livro é buscado sob demanda. `file` is the book filename without
 * extension (e.g. "gn", "1sm").
 */
export async function fetchLocalChapter(
  file: string,
  chapter: number,
): Promise<Verse[]> {
  const book = await loadJson<DataBook>(`pt/${file}.json`);
  if (!book) return [];

  return (book[String(chapter)] ?? []).map((v) => ({ verse: v.v, text: v.t }));
}

/**
 * Available parallel columns.
 * "pt" = Matos Soares (empacotado) · "av" = Ave-Maria (buscado em runtime)
 * "la" = Vulgata Clementina · "en" = King James
 */
export type Lang = "la" | "pt" | "en" | "av";

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
