import type { BookDef } from "../data/books";
import type { Verse } from "./bibleApi";

/**
 * Tradução Ave-Maria (Editora Ave-Maria).
 *
 * O texto NÃO é empacotado no projeto: é buscado em runtime a partir de uma
 * cópia pública em JSON, servida via CDN, e mantido apenas em memória durante
 * a sessão (o navegador ainda reaproveita o cache HTTP entre visitas).
 *
 * A origem pode ser trocada por VITE_AVEMARIA_URL sem alterar código.
 */
const SOURCE =
  (import.meta.env?.VITE_AVEMARIA_URL as string | undefined) ??
  "https://cdn.jsdelivr.net/gh/fidalgobr/bibliaAveMariaJSON@main/bibliaAveMaria.json";

/* ── Formato do JSON de origem ─────────────────────────── */

interface SrcVerse {
  versiculo: number;
  texto: string;
}

interface SrcChapter {
  capitulo: number;
  versiculos: SrcVerse[];
}

interface SrcBook {
  nome?: string;
  livro?: string;
  capitulos: SrcChapter[];
}

/** Chaves de topo variam entre cópias; tratamos como mapa de arrays. */
type SrcBible = Record<string, unknown>;

/* ── Normalização de nomes de livro ────────────────────── */

/** Sinais diacríticos combinantes (após NFD). */
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/** Palavras de enfeite que aparecem em títulos longos e não distinguem livros. */
const FILLER = /\b(livros?|de|do|da|dos|das|evangelho|segundo|sao|santo|s)\b/g;

/**
 * Reduz um nome de livro a uma chave comparável: sem acentos, sem maiúsculas,
 * sem pontuação, com numerais romanos iniciais convertidos em dígitos e sem
 * as palavras de ligação que variam entre edições.
 *
 * "Evangelho segundo São João" → "joao" · "II Coríntios" → "2corintios"
 */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/^\s*iii(?=\W)/, "3 ")
    .replace(/^\s*ii(?=\W)/, "2 ")
    .replace(/^\s*i(?=\W)/, "1 ")
    .replace(/^\s*primeiro\b/, "1 ")
    .replace(/^\s*terceiro\b/, "3 ")
    .replace(FILLER, " ")
    .replace(/[^a-z0-9]/g, "");
}

const leadDigit = (s: string) => (/^\d/.test(s) ? s[0] : "");
const stripLead = (s: string) => s.replace(/^\d+/, "");

/**
 * Nomes alternativos por livro, escritos em linguagem natural — passam pela
 * mesma normalização das chaves vindas do JSON.
 */
const ALIASES: Record<string, string[]> = {
  ju: ["Juízes"],
  rt: ["Rute", "Rut"],
  "1pa": ["1 Crônicas", "1 Paralipômenos"],
  "2pa": ["2 Crônicas", "2 Paralipômenos"],
  jdi: ["Judite", "Judit", "Judith"],
  job: ["Jó", "Job"],
  ees: ["Eclesiastes", "Coélet", "Qohélet"],
  cc: ["Cântico dos Cânticos", "Cantares", "Cânticos"],
  eus: ["Eclesiástico", "Ben Sirac", "Sirácida", "Sirac"],
  ba: ["Baruc", "Baruque"],
  os: ["Oseias", "Oséias", "Oseas"],
  mic: ["Miqueias", "Miquéias", "Miqueas"],
  hc: ["Habacuc", "Habacuque"],
  act: ["Atos dos Apóstolos", "Atos"],
  jda: ["Judas"],
  ap: ["Apocalipse", "Revelação"],
};

/* ── Carga e indexação (uma vez por sessão) ────────────── */

let cache: Promise<SrcBible> | null = null;

function load(): Promise<SrcBible> {
  if (!cache) {
    cache = fetch(SOURCE)
      .then((res) => {
        if (!res.ok) throw new Error(`Ave-Maria indisponível (${res.status}).`);
        return res.json() as Promise<SrcBible>;
      })
      .catch((err) => {
        cache = null; // permite nova tentativa após falha de rede
        throw err;
      });
  }
  return cache;
}

/**
 * Separa os livros por testamento sem depender do nome exato das chaves:
 * qualquer propriedade de topo que seja um array de livros é considerada, e a
 * classificação vem do próprio nome da chave ("antigo/velho/old" vs resto).
 */
function testaments(bible: SrcBible): { AT: SrcBook[]; NT: SrcBook[] } {
  const out = { AT: [] as SrcBook[], NT: [] as SrcBook[] };
  for (const [key, value] of Object.entries(bible ?? {})) {
    if (!Array.isArray(value)) continue;
    const books = value.filter(
      (b): b is SrcBook => !!b && typeof b === "object" && "capitulos" in b,
    );
    if (books.length === 0) continue;
    const side = /antig|velho|old|vetus/i.test(key) ? "AT" : "NT";
    out[side].push(...books);
  }
  return out;
}

/** Nome do livro na fonte, tolerando variações de campo. */
const bookName = (b: SrcBook): string => b.nome ?? b.livro ?? "";

function matches(srcName: string, keys: string[]): boolean {
  const n = norm(srcName);
  if (keys.includes(n)) return true;
  // Títulos longos ("Primeira Carta aos Coríntios"): compara o miolo, mas
  // exige que o numeral inicial coincida para não confundir 1/2/3 João.
  return keys.some((k) => {
    if (leadDigit(n) !== leadDigit(k)) return false;
    const a = stripLead(n);
    const b = stripLead(k);
    // Ambos precisam ter corpo suficiente: senão "Jó" casaria com "João".
    if (a.length < 4 || b.length < 4) return false;
    return a.includes(b) || b.includes(a);
  });
}

/** Localiza o livro: primeiro no testamento esperado, depois no outro. */
function findBook(bible: SrcBible, book: BookDef): SrcBook | undefined {
  const { AT, NT } = testaments(bible);
  const keys = [book.pt, ...(ALIASES[book.file] ?? [])].map(norm);

  const preferred = book.testament === "AT" ? AT : NT;
  const other = book.testament === "AT" ? NT : AT;

  // Exato antes de aproximado, e dentro do testamento certo antes de fora.
  return (
    preferred.find((x) => keys.includes(norm(bookName(x)))) ??
    preferred.find((x) => matches(bookName(x), keys)) ??
    other.find((x) => keys.includes(norm(bookName(x))))
  );
}

function clean(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*\[?\d+\]?[.\s]\s*/, "") // marcador de versículo às vezes embutido
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Devolve os versículos de um capítulo na tradução Ave-Maria.
 * Lança erro descritivo quando a fonte falha ou não contém o livro/capítulo,
 * para que a interface possa dizer o motivo em vez de só ficar vazia.
 */
export async function fetchAveMariaChapter(
  book: BookDef,
  chapter: number,
): Promise<Verse[]> {
  const bible = await load();
  const src = findBook(bible, book);
  if (!src) {
    const { AT, NT } = testaments(bible);
    throw new Error(
      `Ave-Maria: livro "${book.pt}" não encontrado na fonte ` +
        `(${AT.length} livros no AT, ${NT.length} no NT).`,
    );
  }
  if (!src?.capitulos) return [];

  const cap =
    src.capitulos.find((c) => c.capitulo === chapter) ?? src.capitulos[chapter - 1];
  if (!cap?.versiculos) return [];

  return cap.versiculos
    .map((v, i) => ({ verse: v.versiculo ?? i + 1, text: clean(v.texto ?? "") }))
    .filter((v) => v.text.length > 0);
}
