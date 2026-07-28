import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOOKS, type BookDef } from "./data/books";
import {
  fetchChapter,
  fetchLocalChapter,
  mergeVerses,
  type Lang,
  type ParallelRow,
} from "./lib/bibleApi";
import { fetchAveMariaChapter } from "./lib/aveMaria";
import LiturgiaView from "./components/Liturgia";
import CatenaPanel from "./components/CatenaPanel";
import { Cross, Fleuron } from "./components/ornaments";
import { catenaAvailable, catenaChapterVerses } from "./lib/catena";

type Tab = "biblia" | "liturgia";
/** Como o texto flui: prosa contínua, um versículo por linha, ou colunas. */
type Mode = "prosa" | "versos" | "paralelo";
type Theme = "noite" | "tinta";

const LS_KEY = "codex.reader.v1";

const MODES: { key: Mode; label: string }[] = [
  { key: "prosa", label: "Prosa" },
  { key: "versos", label: "Versos" },
  { key: "paralelo", label: "Paralelo" },
];

interface ColumnDef {
  key: Lang;
  label: string;
  title: string;
  subtitle: string;
  italic?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "pt", label: "Pt", title: "Matos Soares", subtitle: "Tradução portuguesa · 1956" },
  { key: "av", label: "AM", title: "Ave-Maria", subtitle: "Editora Ave-Maria · ed. atual" },
  { key: "la", label: "La", title: "Vulgata Latina", subtitle: "Editio Clementina", italic: true },
  { key: "en", label: "En", title: "King James Version", subtitle: "Authorized Version · 1611" },
];

interface Prefs {
  file: string;
  chapter: number;
  mode: Mode;
  theme: Theme;
  fs: number;
  lh: number;
  measure: number;
  sidebarOpen: boolean;
  show: Record<Lang, boolean>;
  ornaments: boolean;
}

const DEFAULTS: Prefs = {
  file: "jo",
  chapter: 1,
  mode: "prosa",
  theme: "noite",
  fs: 20,
  lh: 1.75,
  measure: 720,
  sidebarOpen: true,
  show: { pt: true, av: false, la: false, en: false },
  ornaments: true,
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULTS, ...p, show: { ...DEFAULTS.show, ...(p.show ?? {}) } };
  } catch {
    return DEFAULTS;
  }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function App() {
  const prefs = useRef<Prefs>(loadPrefs());

  const [tab, setTab] = useState<Tab>("biblia");
  const [bookIndex, setBookIndex] = useState(() => {
    const i = BOOKS.findIndex((b) => b.file === prefs.current.file);
    return i < 0 ? BOOKS.findIndex((b) => b.file === "jo") : i;
  });
  const [chapter, setChapter] = useState(prefs.current.chapter);
  const [rows, setRows] = useState<ParallelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>(prefs.current.mode);
  const [theme, setTheme] = useState<Theme>(prefs.current.theme);
  const [fs, setFs] = useState(prefs.current.fs);
  const [lh, setLh] = useState(prefs.current.lh);
  const [measure, setMeasure] = useState(prefs.current.measure);
  const [ornaments, setOrnaments] = useState(prefs.current.ornaments);
  const [show, setShow] = useState<Record<Lang, boolean>>(prefs.current.show);

  const [sidebarOpen, setSidebarOpen] = useState(prefs.current.sidebarOpen);
  const [typeOpen, setTypeOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [jump, setJump] = useState("");

  const [catenaVerse, setCatenaVerse] = useState<number | null>(null);
  const [catenaSet, setCatenaSet] = useState<Set<number>>(new Set());

  const [progress, setProgress] = useState(0);
  const [barHidden, setBarHidden] = useState(false);
  const lastScroll = useRef(0);
  const readerRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const activeBookRef = useRef<HTMLButtonElement | null>(null);

  const book: BookDef = BOOKS[bookIndex];
  const hasCatena = catenaAvailable(book.file);

  /* ── Persistência de preferências e posição ── */
  useEffect(() => {
    const p: Prefs = {
      file: book.file, chapter, mode, theme, fs, lh, measure,
      sidebarOpen, show, ornaments,
    };
    prefs.current = p;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(p));
    } catch {
      /* ignora quota/modo privado */
    }
  }, [book.file, chapter, mode, theme, fs, lh, measure, sidebarOpen, show, ornaments]);

  useEffect(() => {
    setCatenaVerse(null);
  }, [bookIndex, chapter]);

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

  /* ── Carga do capítulo ── */
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [laRes, ptRes, enRes, avRes] = await Promise.allSettled([
          fetchChapter(book.nr, chapter, "vulgate", ctrl.signal),
          fetchLocalChapter(book.file, chapter),
          fetchChapter(book.nr, chapter, "kjv", ctrl.signal),
          fetchAveMariaChapter(book, chapter),
        ]);
        if (laRes.status === "rejected" && (laRes.reason as Error)?.name === "AbortError") return;
        // A Ave-Maria vem de um único JSON compartilhado e não é abortável:
        // descarta o resultado se o leitor já mudou de capítulo.
        if (ctrl.signal.aborted) return;
        const la = laRes.status === "fulfilled" ? laRes.value : [];
        const pt = ptRes.status === "fulfilled" ? ptRes.value : [];
        const en = enRes.status === "fulfilled" ? enRes.value : [];
        const av = avRes.status === "fulfilled" ? avRes.value : [];
        if (la.length === 0 && pt.length === 0 && en.length === 0 && av.length === 0) {
          if (laRes.status === "rejected" || ptRes.status === "rejected" || enRes.status === "rejected") {
            setError("Não foi possível consultar o códice. Tente novamente.");
          }
        }
        setRows(mergeVerses({ la, pt, en, av }));
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Não foi possível consultar o códice. Tente novamente.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [book.nr, book.file, chapter]);

  useEffect(() => {
    if (readerRef.current) readerRef.current.scrollTop = 0;
    setProgress(0);
    setBarHidden(false);
    lastScroll.current = 0;
  }, [bookIndex, chapter]);

  /* Mantém o livro corrente visível na Bibliotheca. */
  useEffect(() => {
    const nav = navRef.current;
    const btn = activeBookRef.current;
    if (nav && btn) nav.scrollTop = Math.max(0, btn.offsetTop - nav.clientHeight * 0.4);
  }, [bookIndex, sidebarOpen, query]);

  const prevChapter = useCallback(() => {
    if (chapter > 1) setChapter((c) => c - 1);
    else if (bookIndex > 0) {
      setBookIndex(bookIndex - 1);
      setChapter(BOOKS[bookIndex - 1].chapters);
    }
  }, [bookIndex, chapter]);

  const nextChapter = useCallback(() => {
    if (chapter < book.chapters) setChapter((c) => c + 1);
    else if (bookIndex < BOOKS.length - 1) {
      setBookIndex(bookIndex + 1);
      setChapter(1);
    }
  }, [book.chapters, bookIndex, chapter]);

  /* ── Atalhos: ⌘K/Ctrl+K, setas, Esc ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setTab("biblia");
        setJump("");
        setPaletteOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setTypeOpen(false);
        setCatenaVerse(null);
        return;
      }
      if (tab !== "biblia" || paletteOpen) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "ArrowLeft") prevChapter();
      else if (e.key === "ArrowRight") nextChapter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, paletteOpen, prevChapter, nextChapter]);

  function onReaderScroll(e: React.UIEvent<HTMLElement>) {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 40 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0);
    setBarHidden(el.scrollTop > lastScroll.current && el.scrollTop > 120);
    lastScroll.current = el.scrollTop;
  }

  function goTo(i: number, c: number) {
    setBookIndex(i);
    setChapter(Math.min(Math.max(1, c), BOOKS[i].chapters));
    setPaletteOpen(false);
    setJump("");
    if (window.innerWidth < 900) setSidebarOpen(false);
  }

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return BOOKS.map((b, i) => ({ b, i })).filter(
      ({ b }) => !q || normalize(b.pt).includes(q) || normalize(b.la).includes(q),
    );
  }, [query]);

  /** "Jo 3,16" · "sal 51" · "genesis" → livros candidatos + capítulo. */
  const jumpParse = useMemo(() => {
    const m = jump.trim().match(/^(.*?)[\s.,:]*(\d+)?[\s.,:]*(\d+)?$/);
    const name = normalize((m?.[1] ?? jump).trim());
    const ch = m?.[2] ? Number(m[2]) : null;
    const list = BOOKS.map((b, i) => ({ b, i })).filter(
      ({ b }) => !name || normalize(b.pt).includes(name) || normalize(b.la).includes(name),
    );
    return { list: list.slice(0, 40), ch };
  }, [jump]);

  const shown = COLUMNS.filter((c) => show[c.key]);
  const activeCols = shown.length > 0 ? shown : [COLUMNS[0]];
  const cols = activeCols.length;
  const empty = !loading && !error && rows.length === 0;

  const readerVars = {
    ["--fs" as string]: `${fs}px`,
    ["--lh" as string]: `${lh}`,
    ["--measure" as string]: `${measure}px`,
  } as React.CSSProperties;

  const verseButton = (n: number) => {
    const marked = hasCatena && catenaSet.has(n);
    return (
      <button
        onClick={marked ? () => setCatenaVerse(n) : undefined}
        title={marked ? "Comentário dos Padres (Catena Aurea)" : undefined}
        className={`font-display mr-1 align-super text-[0.56em] font-semibold transition ${
          marked ? "verse-mark cursor-pointer" : "cursor-default text-[var(--gold-dim)]"
        }`}
      >
        {n}
      </button>
    );
  };

  return (
    <div
      data-theme={theme}
      className="bg-night flex h-[100dvh] flex-col overflow-hidden bg-[var(--page)] text-[var(--ink)]"
    >
      {/* ── Barra única, esconde ao rolar ─────────────────── */}
      <header
        className="relative z-30 shrink-0 border-b border-[var(--line-soft)] bg-[var(--surf)]/95 backdrop-blur transition-transform duration-300"
        style={{ transform: barHidden ? "translateY(-58px)" : "none" }}
      >
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            title="Bibliotheca"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] text-[var(--gold)] transition hover:bg-[var(--raise)]"
          >
            ☰
          </button>

          <div className="flex min-w-0 items-center gap-2 text-[var(--gold)]">
            <Cross className="candle h-4 w-4 shrink-0" />
            <span className="font-display gilt hidden text-[0.78rem] uppercase tracking-[0.28em] sm:inline">
              Codex Sacræ
            </span>
          </div>

          <button
            onClick={() => {
              setTab("biblia");
              setJump("");
              setPaletteOpen(true);
            }}
            title="Ir para… (⌘K)"
            className="mx-auto flex max-w-[52vw] items-baseline gap-2.5 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--sink)] px-4 py-1.5 transition hover:border-[var(--gold-dim)]"
          >
            <span className="font-display whitespace-nowrap text-[0.9rem] text-[var(--gold-lit)]">
              {book.la} {chapter}
            </span>
            <span className="whitespace-nowrap text-[0.8rem] text-[var(--mute)]">{book.pt}</span>
            <span className="font-display hidden whitespace-nowrap text-[0.55rem] tracking-[0.14em] text-[var(--faint)] sm:inline">
              ⌘K
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--sink)] p-0.5 sm:flex">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`font-display rounded px-2.5 py-1.5 text-[0.58rem] uppercase tracking-[0.16em] transition ${
                    mode === m.key
                      ? "bg-[var(--raise)] text-[var(--gold-lit)]"
                      : "text-[var(--mute)] hover:text-[var(--ink-2)]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {COLUMNS.filter((c) => c.key !== "pt").map((c) => (
              <button
                key={c.key}
                onClick={() => setShow((s) => ({ ...s, [c.key]: !s[c.key] }))}
                title={c.title}
                className={`font-display h-9 w-9 rounded-md border text-[0.68rem] transition ${
                  show[c.key]
                    ? "border-[var(--gold-dim)] bg-[var(--raise)] text-[var(--gold-lit)]"
                    : "border-[var(--line)] bg-[var(--sink)] text-[var(--mute)] hover:text-[var(--ink-2)]"
                }`}
              >
                {c.label}
              </button>
            ))}

            <button
              onClick={() => setTypeOpen((o) => !o)}
              title="Leitura"
              className={`font-display h-9 w-9 rounded-md border text-[0.75rem] transition ${
                typeOpen
                  ? "border-[var(--gold-dim)] bg-[var(--raise)] text-[var(--gold-lit)]"
                  : "border-[var(--line)] bg-[var(--sink)] text-[var(--gold)]"
              }`}
            >
              Aa
            </button>

            <button
              onClick={() => setTab((t) => (t === "biblia" ? "liturgia" : "biblia"))}
              className={`font-display rounded-md border px-3 py-2 text-[0.58rem] uppercase tracking-[0.16em] transition ${
                tab === "liturgia"
                  ? "border-[var(--gold-dim)] bg-[var(--raise)] text-[var(--gold-lit)]"
                  : "border-[var(--line)] bg-[var(--sink)] text-[var(--mute)] hover:text-[var(--ink-2)]"
              }`}
            >
              ✦ <span className="hidden sm:inline">Liturgia</span>
            </button>
          </div>
        </div>

        {/* Progresso do capítulo */}
        <div className="h-0.5 bg-[var(--line-soft)]">
          <div
            className="h-0.5 bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        {typeOpen && (
          <div className="rise absolute right-3 top-[4.2rem] z-40 w-72 rounded-xl border border-[var(--line)] bg-[var(--raise)] p-4 shadow-2xl">
            <p className="font-display mb-3.5 text-[0.58rem] uppercase tracking-[0.3em] text-[var(--faint)]">
              Leitura
            </p>
            <div className="flex flex-col gap-4">
              <Slider label="Tamanho" value={fs} min={16} max={28} step={1} suffix="px" onChange={setFs} />
              <Slider label="Entrelinha" value={lh} min={1.4} max={2.2} step={0.05} onChange={setLh} />
              <Slider label="Largura" value={measure} min={520} max={1000} step={20} suffix="px" onChange={setMeasure} />
            </div>

            <p className="font-display mb-2 mt-5 text-[0.58rem] uppercase tracking-[0.3em] text-[var(--faint)]">
              Escuro
            </p>
            <div className="flex gap-1.5">
              {(["noite", "tinta"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`font-display flex-1 rounded-md border py-2 text-[0.6rem] uppercase tracking-[0.14em] transition ${
                    theme === t
                      ? "border-[var(--gold-dim)] bg-[var(--raise)] text-[var(--gold-lit)]"
                      : "border-[var(--line)] bg-[var(--sink)] text-[var(--mute)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={() => setOrnaments((o) => !o)}
              className={`font-display mt-3.5 w-full rounded-md border py-2 text-[0.6rem] uppercase tracking-[0.14em] transition ${
                ornaments
                  ? "border-[var(--gold-dim)] bg-[var(--raise)] text-[var(--gold-lit)]"
                  : "border-[var(--line)] bg-[var(--sink)] text-[var(--mute)]"
              }`}
            >
              Ornamentos
            </button>
          </div>
        )}
      </header>

      {tab === "liturgia" ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-8 sm:px-6 [scrollbar-gutter:stable]">
          <LiturgiaView />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* ── Bibliotheca ─────────────────────────────── */}
          <aside
            data-panel="books"
            data-open={sidebarOpen ? "1" : ""}
            style={{ width: sidebarOpen ? 272 : 0 }}
            className="shrink-0 border-r border-[var(--line-soft)] bg-[var(--sink)]"
          >
            <div className="flex h-full w-[272px] flex-col">
              <div className="px-3.5 pb-2.5 pt-3.5">
                <p className="font-display mb-2.5 text-[0.58rem] uppercase tracking-[0.3em] text-[var(--faint)]">
                  Bibliotheca
                </p>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar livro…"
                  className="font-serif-read w-full rounded-md border border-[var(--line)] bg-[var(--surf)] px-2.5 py-2 text-sm text-[var(--ink)] placeholder-[var(--faint)] outline-none focus:border-[var(--gold-dim)]"
                />
              </div>
              <nav
                ref={navRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-6"
              >
                {(
                  [
                    ["Vetus Testamentum", "AT"],
                    ["Novum Testamentum", "NT"],
                  ] as const
                ).map(([title, t]) => {
                  const items = filtered.filter(({ b }) => b.testament === t);
                  if (items.length === 0) return null;
                  return (
                    <div key={t} className="mb-3.5">
                      <p className="font-display mx-1.5 mb-1.5 mt-2.5 text-[0.55rem] uppercase tracking-[0.28em] text-[var(--faint)]">
                        {title}
                      </p>
                      {items.map(({ b, i }) => (
                        <div key={b.nr}>
                          <button
                            ref={i === bookIndex ? activeBookRef : undefined}
                            onClick={() => goTo(i, 1)}
                            className={`flex w-full items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left transition ${
                              i === bookIndex
                                ? "bg-[var(--raise)] text-[var(--gold-lit)]"
                                : "text-[var(--ink-2)] hover:bg-[var(--raise)] hover:text-[var(--ink)]"
                            }`}
                          >
                            <span className="font-serif-read truncate text-[0.95rem]">{b.pt}</span>
                            <span className="font-display shrink-0 text-[0.55rem] tracking-[0.08em] text-[var(--faint)]">
                              {b.la}
                            </span>
                          </button>

                          {/* Grade de capítulos do livro corrente */}
                          {i === bookIndex && (
                            <div className="grid grid-cols-7 gap-0.5 px-1.5 pb-3 pt-2">
                              {Array.from({ length: b.chapters }, (_, k) => k + 1).map((c) => (
                                <button
                                  key={c}
                                  onClick={() => goTo(i, c)}
                                  className={`font-display rounded border py-1 text-[0.62rem] transition ${
                                    c === chapter
                                      ? "border-[var(--gold-dim)] bg-[var(--raise)] text-[var(--gold-lit)]"
                                      : "border-transparent text-[var(--mute)] hover:border-[var(--line)] hover:text-[var(--ink)]"
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ── Leitor ──────────────────────────────────── */}
          <main
            ref={readerRef}
            onScroll={onReaderScroll}
            className="min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
          >
            <article style={readerVars} className="mx-auto max-w-[var(--measure)] px-6 pb-[20vh] pt-14">
              <header className="mb-11 text-center">
                <p className="font-display text-[0.58rem] uppercase tracking-[0.34em] text-[var(--faint)]">
                  {book.testament === "NT" ? "Novum Testamentum" : "Vetus Testamentum"}
                </p>
                <h2 className="font-display gilt mt-3.5 text-3xl tracking-[0.06em]">
                  {book.la} {chapter}
                </h2>
                <p className="mt-1.5 text-sm text-[var(--mute)]">
                  {book.pt} · capítulo {chapter}
                </p>
                {ornaments && (
                  <div className="mt-4 flex justify-center text-[var(--gold-dim)]">
                    <Fleuron className="h-4 w-32" />
                  </div>
                )}
              </header>

              {loading && <ReaderMessage>Iluminando o pergaminho…</ReaderMessage>}
              {error && !loading && <ReaderMessage tone="error">{error}</ReaderMessage>}
              {empty && <ReaderMessage>Nenhum versículo encontrado para este capítulo.</ReaderMessage>}

              {!loading && !error && rows.length > 0 && mode === "prosa" && (
                <div className="fadein">
                  {activeCols.map((col, ci) => {
                    const text = rows.map((r) => r[col.key]).filter(Boolean) as string[];
                    if (text.length === 0) return null;
                    const first = rows.find((r) => r[col.key]);
                    return (
                      <section key={col.key} className={ci > 0 ? "mt-9 border-t border-[var(--line-soft)] pt-7" : ""}>
                        {ci > 0 && (
                          <p className="font-display mb-3 text-[0.55rem] uppercase tracking-[0.3em] text-[var(--faint)]">
                            {col.title}
                          </p>
                        )}
                        <p
                          className={`font-serif-read text-justify hyphens-auto text-[var(--ink)] [text-wrap:pretty] ${
                            col.italic ? "italic text-[var(--ink-2)]" : ""
                          }`}
                          style={{ fontSize: "var(--fs)", lineHeight: "var(--lh)" }}
                        >
                          {ci === 0 && ornaments && first && (
                            <span className="dropcap">{(first[col.key] as string).charAt(0)}</span>
                          )}
                          {rows.map((r, ri) => {
                            const t = r[col.key];
                            if (!t) return null;
                            const body = ci === 0 && ornaments && ri === 0 ? t.slice(1) : t;
                            return (
                              <span key={r.verse}>
                                {!(ci === 0 && ornaments && ri === 0) && verseButton(r.verse)}
                                {body}{" "}
                              </span>
                            );
                          })}
                        </p>
                      </section>
                    );
                  })}
                </div>
              )}

              {!loading && !error && rows.length > 0 && mode === "versos" && (
                <div className="fadein">
                  {rows.map((r) => (
                    <div
                      key={r.verse}
                      data-active={catenaVerse === r.verse ? "1" : ""}
                      className="verse-row grid grid-cols-[38px_1fr] gap-2.5 rounded py-1.5 pr-2.5"
                    >
                      <div
                        className="text-right"
                        style={{ lineHeight: "var(--lh)", fontSize: "0.7rem" }}
                      >
                        {verseButton(r.verse)}
                      </div>
                      <div>
                        {activeCols.map((col) => (
                          <p
                            key={col.key}
                            className={`font-serif-read [text-wrap:pretty] ${
                              col.key === activeCols[0].key
                                ? "text-[var(--ink)]"
                                : "mt-1 italic text-[var(--mute)]"
                            }`}
                            style={{
                              fontSize: col.key === activeCols[0].key ? "var(--fs)" : "calc(var(--fs) * 0.88)",
                              lineHeight: col.key === activeCols[0].key ? "var(--lh)" : 1.6,
                            }}
                          >
                            {r[col.key] ?? "— indisponível nesta versão —"}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && !error && rows.length > 0 && mode === "paralelo" && (
                <div className="fadein">
                  <div
                    className="parallel-head mb-2.5 grid gap-x-8 border-b border-[var(--line-soft)] pb-3.5"
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
                  >
                    {activeCols.map((col) => (
                      <div key={col.key}>
                        <p className="font-display text-[0.78rem] tracking-[0.1em] text-[var(--gold)]">
                          {col.title}
                        </p>
                        <p className="mt-0.5 text-[0.55rem] uppercase tracking-[0.24em] text-[var(--faint)]">
                          {col.subtitle}
                        </p>
                      </div>
                    ))}
                  </div>
                  {rows.map((r) => (
                    <div
                      key={r.verse}
                      data-active={catenaVerse === r.verse ? "1" : ""}
                      className="verse-row parallel-row grid gap-x-8 rounded py-2 pr-2"
                      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
                    >
                      {activeCols.map((col, i) => (
                        <p
                          key={col.key}
                          className={`font-serif-read [text-wrap:pretty] ${
                            col.italic ? "italic text-[var(--ink-2)]" : "text-[var(--ink)]"
                          }`}
                          style={{ fontSize: "var(--fs)", lineHeight: "var(--lh)" }}
                        >
                          {i === 0 && verseButton(r.verse)}
                          {r[col.key] ?? (
                            <span className="text-sm not-italic text-[var(--faint)]">
                              — indisponível nesta versão —
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-16 flex items-center justify-center gap-4 border-t border-[var(--line-soft)] pt-6">
                <button
                  onClick={prevChapter}
                  className="font-display rounded-md border border-[var(--line)] px-4 py-2 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--gold)] transition hover:bg-[var(--raise)]"
                >
                  ‹ Anterior
                </button>
                <Cross className="h-3.5 w-3.5 text-[var(--gold-dim)]" />
                <button
                  onClick={nextChapter}
                  className="font-display rounded-md border border-[var(--line)] px-4 py-2 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--gold)] transition hover:bg-[var(--raise)]"
                >
                  Próximo ›
                </button>
              </div>

              <p className="mt-6 text-center text-[0.7rem] leading-relaxed text-[var(--faint)]">
                Tradução do Pe. Manuel de Matos Soares (1956) incluída na aplicação · Vulgata
                Clementina e King James via{" "}
                <a
                  href="https://getbible.net"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[var(--gold-dim)] hover:text-[var(--gold)]"
                >
                  getbible.net
                </a>{" "}
                · Catena Aurea, tr. J. H. Newman (1841–45)
                <br />
                Tradução Ave-Maria © Editora Ave-Maria — carregada sob demanda de{" "}
                <a
                  href="https://github.com/fidalgobr/bibliaAveMariaJSON"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[var(--gold-dim)] hover:text-[var(--gold)]"
                >
                  fonte pública em JSON
                </a>
                ; uso pessoal de estudo
              </p>
            </article>
          </main>

          {/* ── Catena Aurea: painel que empurra o texto ── */}
          <CatenaPanel
            bookFile={book.file}
            bookLa={book.la}
            chapter={chapter}
            verse={catenaVerse}
            onClose={() => setCatenaVerse(null)}
          />
        </div>
      )}

      {/* ── Paleta de referências (⌘K) ─────────────────── */}
      {paletteOpen && (
        <div
          onClick={() => setPaletteOpen(false)}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-5 pb-5 pt-[12vh] backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rise flex max-h-[70vh] w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--raise)] shadow-2xl"
          >
            <input
              autoFocus
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && jumpParse.list.length > 0) {
                  goTo(jumpParse.list[0].i, jumpParse.ch ?? 1);
                }
              }}
              placeholder="Jo 3,16 · Salmos 51 · Genesis"
              className="font-serif-read border-b border-[var(--line-soft)] bg-transparent px-5 py-4 text-lg text-[var(--ink)] placeholder-[var(--faint)] outline-none"
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {jumpParse.list.map(({ b, i }) => (
                <button
                  key={b.nr}
                  onClick={() => goTo(i, jumpParse.ch ?? 1)}
                  className="flex w-full items-baseline justify-between gap-3 rounded-md px-3 py-2 text-left text-[var(--ink-2)] transition hover:bg-[var(--surf)] hover:text-[var(--ink)]"
                >
                  <span className="font-serif-read text-base">
                    {b.pt}
                    {jumpParse.ch ? ` ${Math.min(jumpParse.ch, b.chapters)}` : ""}
                  </span>
                  <span className="font-display text-[0.58rem] tracking-[0.1em] text-[var(--faint)]">
                    {b.la}
                  </span>
                </button>
              ))}
              {jumpParse.list.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-[var(--mute)]">
                  Nenhum livro encontrado.
                </p>
              )}
            </div>
            <p className="border-t border-[var(--line-soft)] px-5 py-2.5 text-[0.7rem] text-[var(--faint)]">
              ↵ abrir · ← → capítulos · Esc fechar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-componentes ───────────────────────────────────── */

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex justify-between text-[0.82rem] text-[var(--ink-2)]">
        {label}
        <span className="text-[var(--faint)]">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
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
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <Cross className={`candle h-5 w-5 ${tone === "error" ? "text-[#a24a3f]" : "text-[var(--gold-dim)]"}`} />
      <p
        className={`font-display text-[0.78rem] uppercase tracking-[0.26em] ${
          tone === "error" ? "text-[#c07a70]" : "text-[var(--mute)]"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
