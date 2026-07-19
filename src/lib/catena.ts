/* ── Catena Aurea (St. Thomas Aquinas' golden chain) ──────────
 * Patristic commentary on the four Gospels, keyed by "chapter.verse".
 * Each Gospel is loaded lazily and cached independently, so opening a
 * commentary only fetches the data for the Gospel being read.
 */

export interface CatenaSegment {
  f: string; // Church Father / source
  t: string; // comment text
}

export interface CatenaEntry {
  lemma: string; // the verse fragment being commented
  segments: CatenaSegment[];
}

type CatenaData = Record<string, CatenaEntry>;

/** Book file id (from data/books.ts) → dynamic import of its catena. */
const LOADERS: Record<string, () => Promise<{ default: CatenaData }>> = {
  mt: () => import("../data/catenaMatthew.json") as Promise<{ default: CatenaData }>,
  mc: () => import("../data/catenaMark.json") as Promise<{ default: CatenaData }>,
  lc: () => import("../data/catenaLuke.json") as Promise<{ default: CatenaData }>,
  jo: () => import("../data/catenaJohn.json") as Promise<{ default: CatenaData }>,
};

const cache: Record<string, CatenaData> = {};
const loading: Record<string, Promise<CatenaData>> = {};

/** True if a catena exists for this book (the four Gospels). */
export function catenaAvailable(bookFile: string): boolean {
  return bookFile in LOADERS;
}

async function load(bookFile: string): Promise<CatenaData> {
  if (cache[bookFile]) return cache[bookFile];
  if (!loading[bookFile]) {
    loading[bookFile] = LOADERS[bookFile]()
      .then((m) => {
        cache[bookFile] = (m.default ?? (m as unknown as CatenaData)) as CatenaData;
        return cache[bookFile];
      })
      .catch((e) => {
        delete loading[bookFile]; // allow retry
        throw e;
      });
  }
  return loading[bookFile];
}

/** Returns the commentary for a Gospel verse, or null if none exists. */
export async function fetchCatena(
  bookFile: string,
  chapter: number,
  verse: number,
): Promise<CatenaEntry | null> {
  if (!catenaAvailable(bookFile)) return null;
  const data = await load(bookFile);
  return data[`${chapter}.${verse}`] ?? null;
}
