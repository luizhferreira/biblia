/* ── Catena Aurea (St. Thomas Aquinas' golden chain) ──────────
 * Patristic commentary on the Gospel of John, keyed by "chapter.verse".
 * Loaded lazily on first use to keep the initial view light.
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

let cache: CatenaData | null = null;
let loading: Promise<CatenaData> | null = null;

/** Only the Gospel of John is covered by this catena. */
export function catenaAvailable(bookFile: string): boolean {
  return bookFile === "jo";
}

async function load(): Promise<CatenaData> {
  if (cache) return cache;
  if (!loading) {
    loading = import("../data/catenaJohn.json")
      .then((m) => {
        cache = (m.default ?? m) as CatenaData;
        return cache;
      })
      .catch((e) => {
        loading = null; // allow retry
        throw e;
      });
  }
  return loading;
}

/** Returns the commentary for a John verse, or null if none exists. */
export async function fetchCatena(
  bookFile: string,
  chapter: number,
  verse: number,
): Promise<CatenaEntry | null> {
  if (!catenaAvailable(bookFile)) return null;
  const data = await load();
  return data[`${chapter}.${verse}`] ?? null;
}
