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

interface LocalVerse {
  numero: number;
  texto: string;
}

interface LocalChapter {
  capitulo: number;
  versiculos: LocalVerse[];
}

interface LocalBook {
  livro: string;
  capitulos: LocalChapter[];
}

const localBooks = import.meta.glob<LocalBook>(
  "../../biblia-db-main/{antigotestamento,novotestamento}/*.json",
  { import: "default" },
);

/**
 * Load a chapter of the Matos Soares translation from the bundled
 * biblia-db-main JSON files. `file` is the book filename without extension
 * (e.g. "gn", "1sm").
 */
export async function fetchLocalChapter(
  file: string,
  chapter: number,
): Promise<Verse[]> {
  const path = Object.keys(localBooks).find((p) => p.endsWith(`/${file}.json`));
  if (!path) return [];

  const book = await localBooks[path]();
  const cap = book.capitulos.find((c) => c.capitulo === chapter);
  if (!cap) return [];

  return cap.versiculos
    .map((v) => ({
      verse: v.numero,
      // strip the leading "[N] " verse marker embedded in the source text
      text: clean(v.texto.replace(/^\s*\[\d+\]\s*/, "")),
    }))
    .filter((v) => v.text.length > 0);
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
