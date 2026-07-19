import { useEffect, useState } from "react";
import { fetchCatena, type CatenaEntry } from "../lib/catena";
import { Cross, Fleuron } from "./ornaments";

interface Props {
  bookFile: string;
  bookLa: string;
  chapter: number;
  verse: number | null;
  onClose: () => void;
}

/** Slide-in drawer showing the Catena Aurea commentary for a verse. */
export default function CatenaPanel({
  bookFile,
  bookLa,
  chapter,
  verse,
  onClose,
}: Props) {
  const [entry, setEntry] = useState<CatenaEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const open = verse !== null;

  // Load commentary when the selected verse changes.
  useEffect(() => {
    if (verse === null) return;
    let alive = true;
    setLoading(true);
    setError(false);
    setEntry(null);
    fetchCatena(bookFile, chapter, verse)
      .then((e) => alive && setEntry(e))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bookFile, chapter, verse]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className="frame-gold relative z-10 flex h-full w-full max-w-xl flex-col bg-[#0d0b07] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Catena Aurea commentary"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#332a16] bg-[#100e08]/95 px-5 py-4">
          <div>
            <p className="font-display text-[0.6rem] uppercase tracking-[0.3em] text-[#6b5c3a]">
              Catena Aurea
            </p>
            <h3 className="font-display gold-text text-lg">
              {bookLa} {chapter}:{verse}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-[#5a4a24] px-3 py-1.5 text-[#d8b366] transition hover:bg-[#1b170e]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Cross className="candle h-6 w-6 text-[#8a6c31]" />
              <p className="font-display text-sm uppercase tracking-[0.25em] text-[#a89a76]">
                Gathering the Fathers…
              </p>
            </div>
          )}

          {error && !loading && (
            <p className="py-20 text-center text-sm text-[#c07a70]">
              Could not load the commentary. Please try again.
            </p>
          )}

          {!loading && !error && !entry && (
            <p className="py-20 text-center text-sm text-[#6b5c3a]">
              No commentary is available for this verse.
            </p>
          )}

          {!loading && !error && entry && (
            <div className="fadein">
              {entry.lemma && (
                <blockquote className="mb-5 border-l-2 border-[#8a6c31] pl-4">
                  <p className="font-serif-read text-[1.05rem] italic text-[#e8dfc8]">
                    “{entry.lemma}”
                  </p>
                </blockquote>
              )}

              <div className="mb-5 flex justify-center text-[#8a6c31]">
                <Fleuron className="h-4 w-24 opacity-70" />
              </div>

              <div className="space-y-5">
                {entry.segments.map((s, i) => (
                  <div key={i}>
                    {s.f && (
                      <p className="font-display mb-1 text-[0.7rem] uppercase tracking-[0.25em] text-[#c99f4c]">
                        {s.f}
                      </p>
                    )}
                    <p className="font-serif-read whitespace-pre-line text-[1.02rem] leading-relaxed text-[#e0d7c0]">
                      {s.t}
                    </p>
                  </div>
                ))}
              </div>

              <footer className="mt-8 border-t border-[#332a16] pt-4 text-center text-[0.65rem] text-[#6b5c3a]">
                Catena Aurea, tr. J. H. Newman (Oxford, 1841–45) · public domain
              </footer>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
