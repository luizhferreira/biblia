/**
 * Fatia os JSONs monolíticos em arquivos por livro/capítulo dentro de `public/`,
 * de onde são servidos como dados estáticos e buscados sob demanda.
 *
 * Roda no `predev` e no `prebuild`. A saída (`public/data/`) é derivada e não
 * entra no git — as fontes continuam sendo:
 *
 *   src/lib/bibliaAveMaria.json   → public/data/av/{file}.json
 *   biblia-db-main/**\/*.json      → public/data/pt/{file}.json
 *   src/data/catena{Gospel}.json  → public/data/catena/{file}/{capítulo}.json
 *                                 + public/data/catena/{file}/index.json
 *
 * Toda a limpeza de texto e a correspondência de nomes de livro acontecem aqui,
 * uma vez, em vez de a cada leitura no navegador. Um livro que não bata sai como
 * erro de build, não como coluna vazia em produção.
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BOOKS, type BookDef } from "../src/data/books.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "data");

/* ── Formato de saída ──────────────────────────────────────
 * Um arquivo por livro: { "<capítulo>": [{ v, t }, …] }
 * Já limpo e filtrado, para o runtime só precisar de JSON.parse.
 */
type OutVerse = { v: number; t: string };
type OutBook = Record<string, OutVerse[]>;

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

function write(file: string, data: unknown): number {
  const full = path.join(OUT, file);
  mkdirSync(path.dirname(full), { recursive: true });
  const json = JSON.stringify(data);
  writeFileSync(full, json);
  return Buffer.byteLength(json);
}

const kb = (n: number) => `${(n / 1024).toFixed(0)} kB`;

/* ── Ave-Maria ─────────────────────────────────────────────
 * A fonte agrupa os livros por testamento e os nomeia por extenso, com
 * variações entre edições. A correspondência com BOOKS é feita aqui.
 */

interface SrcVerse {
  versiculo?: number;
  texto?: string;
}
interface SrcChapter {
  capitulo?: number;
  versiculos?: SrcVerse[];
}
interface SrcBook {
  nome?: string;
  livro?: string;
  capitulos?: SrcChapter[];
}

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const FILLER = /\b(livros?|de|do|da|dos|das|evangelho|segundo|sao|santo|s)\b/g;

/**
 * Reduz um nome de livro a uma chave comparável: sem acentos, sem maiúsculas,
 * sem pontuação, com numerais romanos iniciais convertidos em dígitos e sem as
 * palavras de ligação que variam entre edições.
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

/** Nomes alternativos por livro, em linguagem natural — passam pelo mesmo `norm`. */
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

const bookName = (b: SrcBook): string => b.nome ?? b.livro ?? "";

function matches(srcName: string, keys: string[]): boolean {
  const n = norm(srcName);
  if (keys.includes(n)) return true;
  // Títulos longos ("Primeira Carta aos Coríntios"): compara o miolo, mas exige
  // que o numeral inicial coincida para não confundir 1/2/3 João.
  return keys.some((k) => {
    if (leadDigit(n) !== leadDigit(k)) return false;
    const a = stripLead(n);
    const b = stripLead(k);
    // Ambos precisam ter corpo suficiente: senão "Jó" casaria com "João".
    if (a.length < 4 || b.length < 4) return false;
    return a.includes(b) || b.includes(a);
  });
}

/** Separa os livros por testamento sem depender do nome exato das chaves. */
function testaments(bible: Record<string, unknown>): { AT: SrcBook[]; NT: SrcBook[] } {
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

function findBook(
  sides: { AT: SrcBook[]; NT: SrcBook[] },
  book: BookDef,
): SrcBook | undefined {
  const keys = [book.pt, ...(ALIASES[book.file] ?? [])].map(norm);
  const preferred = book.testament === "AT" ? sides.AT : sides.NT;
  const other = book.testament === "AT" ? sides.NT : sides.AT;

  // Exato antes de aproximado, e dentro do testamento certo antes de fora.
  return (
    preferred.find((x) => keys.includes(norm(bookName(x)))) ??
    preferred.find((x) => matches(bookName(x), keys)) ??
    other.find((x) => keys.includes(norm(bookName(x))))
  );
}

/** O marcador de versículo às vezes vem embutido no próprio texto. */
const cleanAv = (t: string) =>
  squash(stripTags(t).replace(/^\s*\[?\d+\]?[.\s]\s*/, ""));

function buildAveMaria(): void {
  const srcPath = path.join(ROOT, "src", "lib", "bibliaAveMaria.json");
  const bible = JSON.parse(readFileSync(srcPath, "utf8")) as Record<string, unknown>;
  const sides = testaments(bible);

  let bytes = 0;
  const missing: string[] = [];

  for (const book of BOOKS) {
    const src = findBook(sides, book);
    if (!src?.capitulos) {
      missing.push(`${book.file} (${book.pt})`);
      continue;
    }

    const list = src.capitulos;
    const byNum = new Map<number, SrcChapter>();
    for (const c of list) {
      if (typeof c?.capitulo === "number") byNum.set(c.capitulo, c);
    }

    // Preserva o fallback posicional que o runtime antigo fazia
    // (`capitulos[chapter - 1]`) para fontes sem o campo `capitulo`.
    const out: OutBook = {};
    const last = Math.max(list.length, ...[...byNum.keys(), 0]);
    for (let ch = 1; ch <= last; ch++) {
      const cap = byNum.get(ch) ?? list[ch - 1];
      if (!cap?.versiculos) continue;
      const verses = cap.versiculos
        .map((v, i) => ({ v: v.versiculo ?? i + 1, t: cleanAv(v.texto ?? "") }))
        .filter((v) => v.t.length > 0);
      if (verses.length > 0) out[String(ch)] = verses;
    }

    bytes += write(path.join("av", `${book.file}.json`), out);
  }

  if (missing.length > 0) {
    throw new Error(
      `Ave-Maria: ${missing.length} livro(s) sem correspondência na fonte ` +
        `(${sides.AT.length} no AT, ${sides.NT.length} no NT): ${missing.join(", ")}`,
    );
  }
  console.log(`  av/       ${BOOKS.length} livros · ${kb(bytes)}`);
}

/* ── Matos Soares (biblia-db-main) ─────────────────────────
 * Já vem um arquivo por livro; aqui só normalizamos o formato e limpamos.
 */

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

function buildMatosSoares(): void {
  const base = path.join(ROOT, "biblia-db-main");
  let bytes = 0;
  let count = 0;

  for (const dir of ["antigotestamento", "novotestamento"]) {
    const full = path.join(base, dir);
    for (const name of readdirSync(full)) {
      if (!name.endsWith(".json")) continue;
      const book = JSON.parse(readFileSync(path.join(full, name), "utf8")) as LocalBook;

      const out: OutBook = {};
      for (const cap of book.capitulos ?? []) {
        const verses = (cap.versiculos ?? [])
          // remove o marcador "[N] " embutido no texto de origem
          .map((v) => ({ v: v.numero, t: squash(stripTags(v.texto.replace(/^\s*\[\d+\]\s*/, ""))) }))
          .filter((v) => v.t.length > 0);
        if (verses.length > 0) out[String(cap.capitulo)] = verses;
      }

      bytes += write(path.join("pt", name), out);
      count++;
    }
  }
  console.log(`  pt/       ${count} livros · ${kb(bytes)}`);
}

/* ── Catena Aurea ──────────────────────────────────────────
 * A fonte é um mapa "capítulo.versículo" → comentário. Fatiamos por capítulo e
 * geramos um índice enxuto: marcar quais versículos têm comentário é feito a
 * cada troca de capítulo e não deve custar o evangelho inteiro.
 */

interface CatenaEntry {
  lemma: string;
  segments: { f: string; t: string }[];
}

/** id do livro em books.ts → arquivo-fonte */
const GOSPELS: Record<string, string> = {
  mt: "catenaMatthew.json",
  mc: "catenaMark.json",
  lc: "catenaLuke.json",
  jo: "catenaJohn.json",
};

function buildCatena(): void {
  let bytes = 0;

  for (const [file, srcName] of Object.entries(GOSPELS)) {
    const src = JSON.parse(
      readFileSync(path.join(ROOT, "src", "data", srcName), "utf8"),
    ) as Record<string, CatenaEntry>;

    const chapters = new Map<number, Record<string, CatenaEntry>>();
    for (const [key, entry] of Object.entries(src)) {
      const [chRaw, vRaw] = key.split(".");
      const ch = Number(chRaw);
      const v = Number(vRaw);
      if (Number.isNaN(ch) || Number.isNaN(v)) continue;
      const bucket = chapters.get(ch) ?? {};
      bucket[String(v)] = entry;
      chapters.set(ch, bucket);
    }

    const index: Record<string, number[]> = {};
    for (const [ch, entries] of chapters) {
      bytes += write(path.join("catena", file, `${ch}.json`), entries);
      index[String(ch)] = Object.keys(entries)
        .map(Number)
        .sort((a, b) => a - b);
    }
    bytes += write(path.join("catena", file, "index.json"), index);
  }
  console.log(`  catena/   4 evangelhos · ${kb(bytes)}`);
}

/* ── Execução ──────────────────────────────────────────────*/

console.log("Fatiando dados para public/data/ …");
rmSync(OUT, { recursive: true, force: true });
buildAveMaria();
buildMatosSoares();
buildCatena();
console.log("Pronto.");
