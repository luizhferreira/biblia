import { useEffect, useMemo, useRef, useState } from "react";
import { BOOKS, type BookDef } from "./data/books";
import {
  fetchChapter,
  fetchLocalChapter,
  mergeVerses,
  type ParallelRow,
} from "./lib/bibleApi";
import LiturgiaView from "./components/Liturgia";
import CatenaPanel from "./components/CatenaPanel";
import { Cross, Fleuron } from "./components/ornaments";
import { catenaAvailable, catenaChapterVerses } from "./lib/catena";

type Tab = "biblia" | "liturgia";

export default function App() {
  const [tab, setTab] = useState<Tab>("biblia");
  const [bookIndex, setBookIndex] = useState(49); // João / Ioannes
  const [chapter, setChapter] = useState(1);
  const [rows, setRows] = useState<ParallelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLa, setShowLa] = useState(true);
  const [showPt, setShowPt] = useState(true);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [catenaVerse, setCatenaVerse] = useState<number | null>(null);
  const [catenaSet, setCatenaSet] = useState<Set<number>>(new Set());
  const readerRef = useRef<HTMLDivElement>(null);

  const book: BookDef = BOOKS[bookIndex];
  const hasCatena = catenaAvailable(book.file);

  // Close the commentary when navigating to another chapter/book.
  useEffect(() => {
    setCatenaVerse(null);
  }, [bookIndex, chapter]);

  // Load which verses of the current chapter have commentary, to mark them.
  useEffect(() => {
    if (!hasCatena) {
      setCatenaSet(new Set());
      return;
    }
    let alive = true;
    catenaChapterVerses(book.file, chapter)
      .then((s) => alive && setCatenaSet(s))
      .catch(() => alive && setCatenaSet(new Set()));
    return () => {
      alive = false;
    };
  }, [hasCatena, book.file, chapter]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [laRes, ptRes] = await Promise.allSettled([
          fetchChapter(book.nr, chapter, "vulgate", ctrl.signal),
          fetchLocalChapter(book.file, chapter),
        ]);
        if (
          laRes.status === "rejected" &&
          (laRes.reason as Error)?.name === "AbortError"
        ) {
          return;
        }
        const la = laRes.status === "fulfilled" ? laRes.value : [];
        const pt = ptRes.status === "fulfilled" ? ptRes.value : [];
        if (la.length === 0 && pt.length === 0) {
          if (laRes.status === "rejected" || ptRes.status === "rejected") {
            setError("Não foi possível consultar o códice. Tente novamente.");
          }
        }
        setRows(mergeVerses(la, pt));
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Não foi possível consultar o códice. Tente novamente.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [book.nr, chapter]);

  useEffect(() => {
    readerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [bookIndex, chapter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOOKS.map((b, i) => ({ b, i })).filter(
      ({ b }) =>
        !q ||
        b.pt.toLowerCase().includes(q) ||
        b.la.toLowerCase().includes(q),
    );
  }, [query]);

  const atBooks = filtered.filter(({ b }) => b.testament === "AT");
  const ntBooks = filtered.filter(({ b }) => b.testament === "NT");

  function selectBook(i: number) {
    setBookIndex(i);
    setChapter(1);
    setSidebarOpen(false);
  }

  function prevChapter() {
    if (chapter > 1) setChapter((c) => c - 1);
    else if (bookIndex > 0) {
      const pb = BOOKS[bookIndex - 1];
      setBookIndex(bookIndex - 1);
      setChapter(pb.chapters);
    }
  }
  function nextChapter() {
    if (chapter < book.chapters) setChapter((c) => c + 1);
    else if (bookIndex < BOOKS.length - 1) {
      setBookIndex(bookIndex + 1);
      setChapter(1);
    }
  }

  const gridCols =
    showLa && showPt ? "md:grid-cols-2" : "md:grid-cols-1";

  return (
    <div className="bg-night stars relative min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1500px] flex-col px-3 sm:px-6">
        {/* ── Header ─────────────────────────────── */}
        <header className="pt-8 pb-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-3 text-[#b8933f]">
            <Fleuron className="h-4 w-20 opacity-70" />
            <Cross className="candle h-5 w-5" />
            <Fleuron className="h-4 w-20 -scale-x-100 opacity-70" />
          </div>
          <h1 className="font-blackletter gilt text-4xl leading-none sm:text-6xl">
            Codex Sacræ
          </h1>
          <p className="font-display mt-3 text-[0.6rem] uppercase tracking-[0.45em] text-[#caa257]">
            Vulgata Latina&nbsp;&nbsp;·&nbsp;&nbsp;Tradução Matos Soares
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm italic text-[#9a8d6f]">
            “Lucerna pedibus meis verbum tuum, et lumen semitis meis.”
          </p>
          <p className="mx-auto mt-2 max-w-lg text-[0.7rem] text-[#6b5c3a]">
            Bíblia católica completa (73 livros) — tradução portuguesa do
            Pe. Manuel de Matos Soares (1956) em paralelo à Vulgata Clementina.
          </p>

          {/* ── Abas ─────────────────────────────── */}
          <nav className="mt-5 inline-flex rounded-md border border-[#5a4a24] bg-[#12100a]/90 p-1">
            <TabButton active={tab === "biblia"} onClick={() => setTab("biblia")}>
              ✠ Bíblia
            </TabButton>
            <TabButton
              active={tab === "liturgia"}
              onClick={() => setTab("liturgia")}
            >
              ✦ Liturgia do Dia
            </TabButton>
          </nav>
        </header>

        {tab === "liturgia" && (
          <div className="flex flex-1 pb-8">
            <LiturgiaView />
          </div>
        )}

        {tab === "biblia" && (
        <>
        {/* ── Control bar ────────────────────────── */}
        <div className="frame-gold sticky top-2 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-md bg-[#12100a]/90 px-3 py-3 backdrop-blur">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="font-display rounded border border-[#5a4a24] bg-[#1b170e] px-3 py-2 text-xs uppercase tracking-widest text-[#d8b366] transition hover:bg-[#251f12] md:hidden"
          >
            ☰ Livros
          </button>

          <div className="font-display flex items-center gap-2">
            <span className="gold-text text-lg sm:text-xl">{book.la}</span>
            <span className="text-[#6b5c3a]">·</span>
            <span className="text-sm text-[#a89a76]">{book.pt}</span>
          </div>

          {/* Chapter selector */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={prevChapter}
              className="rounded border border-[#5a4a24] bg-[#1b170e] px-3 py-2 text-[#d8b366] transition hover:bg-[#251f12]"
              aria-label="Capítulo anterior"
            >
              ‹
            </button>
            <select
              value={chapter}
              onChange={(e) => setChapter(Number(e.target.value))}
              className="font-display rounded border border-[#5a4a24] bg-[#1b170e] px-3 py-2 text-sm text-[#e8dfc8] outline-none"
            >
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>
                  Cap. {c}
                </option>
              ))}
            </select>
            <button
              onClick={nextChapter}
              className="rounded border border-[#5a4a24] bg-[#1b170e] px-3 py-2 text-[#d8b366] transition hover:bg-[#251f12]"
              aria-label="Próximo capítulo"
            >
              ›
            </button>
          </div>

          {/* Column toggles */}
          <div className="flex w-full items-center gap-2 border-t border-[#332a16] pt-3 sm:w-auto sm:border-0 sm:pt-0">
            <Toggle active={showLa} onClick={() => setShowLa((v) => !v)}>
              Latina
            </Toggle>
            <Toggle active={showPt} onClick={() => setShowPt((v) => !v)}>
              Português
            </Toggle>
          </div>
        </div>

        {/* ── Body ───────────────────────────────── */}
        <div className="flex flex-1 gap-4 pb-8">
          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen
                ? "fixed inset-0 z-30 block bg-[#0a0a0f]/95 p-4"
                : "hidden"
            } md:static md:z-auto md:block md:w-72 md:shrink-0 md:bg-transparent md:p-0`}
          >
            <div className="frame-gold flex h-full max-h-[80vh] flex-col rounded-md bg-[#100e08] md:h-[calc(100vh-2rem)] md:max-h-none">
              <div className="flex items-center justify-between border-b border-[#332a16] p-3">
                <span className="font-display text-xs uppercase tracking-[0.3em] text-[#d8b366]">
                  Bibliotheca
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-[#d8b366] md:hidden"
                >
                  ✕
                </button>
              </div>
              <div className="p-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar livro…"
                  className="font-serif-read w-full rounded border border-[#3a3018] bg-[#1b170e] px-3 py-2 text-sm text-[#e8dfc8] placeholder-[#6b5c3a] outline-none focus:border-[#8a6c31]"
                />
              </div>
              <nav className="flex-1 overflow-y-auto px-2 pb-3">
                <BookGroup
                  title="Vetus Testamentum"
                  items={atBooks}
                  active={bookIndex}
                  onSelect={selectBook}
                />
                <BookGroup
                  title="Novum Testamentum"
                  items={ntBooks}
                  active={bookIndex}
                  onSelect={selectBook}
                />
              </nav>
            </div>
          </aside>

          {/* Reader */}
          <main
            ref={readerRef}
            className="frame-gold relative flex-1 overflow-y-auto rounded-md bg-[#0d0b07]/80 md:h-[calc(100vh-2rem)]"
          >
            {/* Column headers */}
            <div
              className={`sticky top-0 z-10 grid grid-cols-1 border-b border-[#332a16] bg-[#100e08]/95 backdrop-blur ${gridCols}`}
            >
              {showLa && (
                <div className="border-r border-[#332a16] px-6 py-4 text-center">
                  <p className="font-display gilt text-lg">Vulgata Latina</p>
                  <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[#6b5c3a]">
                    Editio Clementina
                  </p>
                </div>
              )}
              {showPt && (
                <div className="px-6 py-4 text-center">
                  <p className="font-display gilt text-lg">Tradução Portuguesa</p>
                  <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[#6b5c3a]">
                    Pe. Manuel de Matos Soares
                  </p>
                </div>
              )}
            </div>

            {/* Chapter heading */}
            <div className="px-6 pt-6 text-center">
              <h2 className="font-display gold-text text-2xl sm:text-3xl">
                {book.la} {chapter}
              </h2>
              <div className="mt-2 flex justify-center text-[#8a6c31]">
                <Fleuron className="h-4 w-28" />
              </div>
              {hasCatena && (
                <p className="mt-2 text-[0.7rem] text-[#6b5c3a]">
                  Toque no número do versículo ✦ para ver o comentário dos
                  Padres (Catena Aurea).
                </p>
              )}
            </div>

            {/* States */}
            {loading && <ReaderMessage>Iluminando o pergaminho…</ReaderMessage>}
            {error && !loading && (
              <ReaderMessage tone="error">{error}</ReaderMessage>
            )}
            {!loading && !error && rows.length === 0 && (
              <ReaderMessage>
                Nenhum versículo encontrado para este capítulo.
              </ReaderMessage>
            )}

            {/* Verses */}
            {!loading && !error && rows.length > 0 && (
              <div className="fadein px-2 py-6 sm:px-4">
                {rows.map((r) => (
                  <div
                    key={r.verse}
                    className={`grid grid-cols-1 gap-0 rounded transition hover:bg-[#171207]/60 ${gridCols}`}
                  >
                    {showLa && (
                      <VerseCell
                        n={r.verse}
                        text={r.la}
                        latin
                        border={showPt}
                        onCatena={
                          hasCatena && catenaSet.has(r.verse)
                            ? () => setCatenaVerse(r.verse)
                            : undefined
                        }
                        active={catenaVerse === r.verse}
                      />
                    )}
                    {showPt && (
                      <VerseCell
                        n={r.verse}
                        text={r.pt}
                        onCatena={
                          hasCatena && catenaSet.has(r.verse)
                            ? () => setCatenaVerse(r.verse)
                            : undefined
                        }
                        active={catenaVerse === r.verse}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <footer className="border-t border-[#332a16] px-6 py-5 text-center text-xs text-[#6b5c3a]">
              <div className="mb-3 flex items-center justify-center gap-4">
                <button
                  onClick={prevChapter}
                  className="font-display rounded border border-[#5a4a24] px-4 py-1.5 text-[#d8b366] transition hover:bg-[#1b170e]"
                >
                  ‹ Anterior
                </button>
                <Cross className="h-4 w-4 text-[#8a6c31]" />
                <button
                  onClick={nextChapter}
                  className="font-display rounded border border-[#5a4a24] px-4 py-1.5 text-[#d8b366] transition hover:bg-[#1b170e]"
                >
                  Próximo ›
                </button>
              </div>
              <p>
                Vulgata Clementina (latim) consultada via{" "}
                <a
                  href="https://getbible.net"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[#5a4a24] hover:text-[#d8b366]"
                >
                  getbible.net
                </a>
                . Tradução portuguesa do Pe. Manuel de Matos Soares (1956),
                incluída na aplicação — segue a numeração da Vulgata.
              </p>
            </footer>
          </main>
        </div>

        <CatenaPanel
          bookFile={book.file}
          bookLa={book.la}
          chapter={chapter}
          verse={catenaVerse}
          onClose={() => setCatenaVerse(null)}
        />
        </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-display rounded px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
        active
          ? "bg-[#2a2110] text-[#f0d693]"
          : "text-[#8a7a52] hover:text-[#d8b366]"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-display rounded border px-3 py-1.5 text-[0.65rem] uppercase tracking-widest transition ${
        active
          ? "border-[#8a6c31] bg-[#2a2110] text-[#f0d693]"
          : "border-[#3a3018] bg-transparent text-[#6b5c3a] hover:text-[#a89a76]"
      }`}
    >
      {children}
    </button>
  );
}

function BookGroup({
  title,
  items,
  active,
  onSelect,
}: {
  title: string;
  items: { b: BookDef; i: number }[];
  active: number;
  onSelect: (i: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="font-display px-2 pb-1 pt-2 text-[0.6rem] uppercase tracking-[0.3em] text-[#6b5c3a]">
        {title}
      </p>
      <ul>
        {items.map(({ b, i }) => (
          <li key={b.nr}>
            <button
              onClick={() => onSelect(i)}
              className={`flex w-full items-baseline justify-between rounded px-2 py-1.5 text-left transition ${
                active === i
                  ? "bg-[#2a2110] text-[#f0d693]"
                  : "text-[#b3a682] hover:bg-[#17130a] hover:text-[#e8dfc8]"
              }`}
            >
              <span className="font-serif-read text-[0.95rem]">{b.pt}</span>
              <span className="font-display text-[0.65rem] text-[#6b5c3a]">
                {b.la}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerseCell({
  n,
  text,
  latin = false,
  border = false,
  onCatena,
  active = false,
}: {
  n: number;
  text?: string;
  latin?: boolean;
  border?: boolean;
  onCatena?: () => void;
  active?: boolean;
}) {
  return (
    <div
      className={`px-5 py-2 ${border ? "md:border-r md:border-[#241d10]" : ""} ${
        active ? "bg-[#1d1608]/70" : ""
      }`}
    >
      <p
        className={`font-serif-read text-[1.05rem] leading-relaxed ${
          latin ? "italic text-[#d9cba3]" : "text-[#e8dfc8]"
        }`}
      >
        {onCatena ? (
          <button
            onClick={onCatena}
            title="Ver comentário dos Padres (Catena Aurea)"
            className={`group mr-1 inline-flex items-baseline align-super font-display text-[0.7rem] font-semibold transition ${
              active
                ? "text-[#f0d693]"
                : "text-[#c99f4c] hover:text-[#f0d693]"
            }`}
          >
            <span className="underline decoration-dotted decoration-[#8a6c31] underline-offset-2">
              {n}
            </span>
            <span className="ml-0.5 text-[0.6rem] opacity-60 group-hover:opacity-100">
              ✦
            </span>
          </button>
        ) : (
          <sup className="mr-1 align-super font-display text-[0.7rem] font-semibold text-[#c99f4c]">
            {n}
          </sup>
        )}
        {text ?? (
          <span className="text-sm not-italic text-[#6b5c3a]">
            — indisponível nesta versão —
          </span>
        )}
      </p>
    </div>
  );
}

function ReaderMessage({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <Cross
        className={`candle h-6 w-6 ${
          tone === "error" ? "text-[#a24a3f]" : "text-[#8a6c31]"
        }`}
      />
      <p
        className={`font-display text-sm uppercase tracking-[0.25em] ${
          tone === "error" ? "text-[#c07a70]" : "text-[#a89a76]"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
