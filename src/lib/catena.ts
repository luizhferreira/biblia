/* ── Catena Aurea (St. Thomas Aquinas' golden chain) ──────────
 * Patristic commentary on the four Gospels, keyed by "chapter.verse".
 *
 * `scripts/build-data.ts` fatia cada evangelho em um arquivo por capítulo mais
 * um índice enxuto. A distinção importa: marcar quais versículos têm comentário
 * roda a cada troca de capítulo e só consulta o índice (poucos kB por
 * evangelho); o texto dos Padres — que é o volume — só é buscado quando o
 * leitor de fato abre o painel, e apenas o capítulo aberto.
 */

import { loadJson } from "./dataFetch";

export interface CatenaSegment {
  f: string; // Church Father / source
  t: string; // comment text
}

export interface CatenaEntry {
  lemma: string; // the verse fragment being commented
  segments: CatenaSegment[];
}

/** Capítulo → versículos com comentário. */
type CatenaIndex = Record<string, number[]>;

/** Versículo → comentário, dentro de um capítulo. */
type CatenaChapter = Record<string, CatenaEntry>;

/** Book file ids (from data/books.ts) que possuem catena: os quatro evangelhos. */
const GOSPELS = new Set(["mt", "mc", "lc", "jo"]);

/** True if a catena exists for this book (the four Gospels). */
export function catenaAvailable(bookFile: string): boolean {
  return GOSPELS.has(bookFile);
}

/** Verse numbers in a chapter that have commentary (for marking them). */
export async function catenaChapterVerses(
  bookFile: string,
  chapter: number,
): Promise<Set<number>> {
  if (!catenaAvailable(bookFile)) return new Set();
  const index = await loadJson<CatenaIndex>(`catena/${bookFile}/index.json`);
  return new Set(index?.[String(chapter)] ?? []);
}

/** Returns the commentary for a Gospel verse, or null if none exists. */
export async function fetchCatena(
  bookFile: string,
  chapter: number,
  verse: number,
): Promise<CatenaEntry | null> {
  if (!catenaAvailable(bookFile)) return null;
  const data = await loadJson<CatenaChapter>(`catena/${bookFile}/${chapter}.json`);
  return data?.[String(verse)] ?? null;
}
