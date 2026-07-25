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

/**
 * Comentário patrístico (Catena Aurea) em painel lateral que EMPURRA o
 * leitor em telas largas e vira sobreposição abaixo de 900px (ver index.css).
 */
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside
      data-panel="catena"
      data-open={open ? "1" : ""}
      style={{ width: open ? 400 : 0 }}
      className="shrink-0 border-l border-[var(--line)] bg-[var(--sink)]"
      aria-label="Catena Aurea"
    >
      <div className="flex h-full w-[400px] flex-col">
        <div className="flex items-start justify-between gap-2.5 border-b border-[var(--line-soft)] bg-[var(--surf)] px-4 py-3.5">
          <div>
            <p className="font-display text-[0.55rem] uppercase tracking-[0.3em] text-[var(--faint)]">
              Catena Aurea
            </p>
            <p className="font-display mt-1 text-[0.95rem] tracking-[0.05em] text-[var(--gold)]">
              {bookLa} {chapter}:{verse ?? ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar comentário"
            className="h-7 w-7 rounded-md border border-[var(--line)] text-[var(--gold)] transition hover:bg-[var(--raise)]"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Cross className="candle h-5 w-5 text-[var(--gold-dim)]" />
              <p className="font-display text-[0.78rem] uppercase tracking-[0.26em] text-[var(--mute)]">
                Reunindo os Padres…
              </p>
            </div>
          )}

          {error && !loading && (
            <p className="py-20 text-center text-sm text-[#c07a70]">
              Não foi possível carregar o comentário. Tente novamente.
            </p>
          )}

          {!loading && !error && !entry && open && (
            <p className="py-20 text-center text-sm text-[var(--mute)]">
              Sem comentário para este versículo.
            </p>
          )}

          {!loading && !error && entry && (
            <div className="fadein">
              {entry.lemma && (
                <blockquote className="mb-5 border-l-2 border-[var(--gold-dim)] pl-3.5">
                  <p className="font-serif-read text-[1.05rem] italic leading-relaxed text-[var(--ink)]">
                    “{entry.lemma}”
                  </p>
                </blockquote>
              )}

              <div className="mb-5 flex justify-center text-[var(--gold-dim)]">
                <Fleuron className="h-4 w-24 opacity-70" />
              </div>

              <div className="space-y-5">
                {entry.segments.map((s, i) => (
                  <div key={i}>
                    {s.f && (
                      <p className="font-display mb-1.5 text-[0.62rem] uppercase tracking-[0.22em] text-[var(--gold)]">
                        {s.f}
                      </p>
                    )}
                    <p className="font-serif-read whitespace-pre-line text-[0.98rem] leading-relaxed text-[var(--ink-2)] [text-wrap:pretty]">
                      {s.t}
                    </p>
                  </div>
                ))}
              </div>

              <footer className="mt-8 border-t border-[var(--line-soft)] pt-4 text-center text-[0.65rem] text-[var(--faint)]">
                Catena Aurea, tr. J. H. Newman (Oxford, 1841–45) · domínio público
              </footer>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
