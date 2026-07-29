/**
 * Pré-renderização estática para SEO.
 *
 * Roda DEPOIS do `vite build`. Para cada livro×capítulo, usa o `dist/index.html`
 * como molde e escreve `dist/{slug}/{capítulo}/index.html` com:
 *   • <title> e <meta name="description"> próprios do capítulo
 *   • <link rel="canonical"> da URL canônica
 *   • o texto dos versículos (todas as traduções disponíveis) dentro de #root,
 *     com o latim em <span lang="la">, e prev/próximo + capítulos como <a> reais
 *
 * O React (CSR) assume a página por cima ao montar — o crawler recebe o texto
 * pronto, o usuário recebe a interatividade. Gera também sitemap.xml, robots.txt
 * e uma home (`dist/index.html`) com índice navegável de livros.
 *
 * A URL pública canônica vem de SITE_URL (env), com um padrão para o domínio
 * atual. Troque quando migrar para domínio próprio.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BOOKS, type BookDef } from "../src/data/books.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const DATA = path.join(ROOT, "public", "data");

const SITE_URL = (process.env.SITE_URL ?? "https://biblia.luizmt2002.workers.dev").replace(/\/+$/, "");

/* ── Dados ─────────────────────────────────────────────────*/

type DataVerse = { v: number; t: string };
type DataBook = Record<string, DataVerse[]>;
type Lang = "pt" | "la" | "av" | "en";

/** Cache de livros lidos de public/data, por "lang/file". */
const bookCache = new Map<string, DataBook | null>();
function readBook(lang: Lang, file: string): DataBook | null {
  const key = `${lang}/${file}`;
  if (bookCache.has(key)) return bookCache.get(key)!;
  let data: DataBook | null = null;
  try {
    data = JSON.parse(readFileSync(path.join(DATA, lang, `${file}.json`), "utf8")) as DataBook;
  } catch {
    data = null; // tradução não cobre este livro (ex.: KJV sem deuterocanônicos)
  }
  bookCache.set(key, data);
  return data;
}

function verses(lang: Lang, file: string, chapter: number): DataVerse[] {
  return readBook(lang, file)?.[String(chapter)] ?? [];
}

/* ── Escapes ───────────────────────────────────────────────*/

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => escHtml(s).replace(/"/g, "&quot;");

/* ── Conteúdo pré-renderizado de um capítulo ───────────────*/

interface Column {
  lang: Lang;
  label: string;
  latin?: boolean;
}
const COLUMNS: Column[] = [
  { lang: "pt", label: "Matos Soares — português" },
  { lang: "la", label: "Vulgata Latina", latin: true },
  { lang: "av", label: "Ave-Maria — português" },
  { lang: "en", label: "King James Version — inglês" },
];

function versesToProse(vs: DataVerse[]): string {
  return vs
    .map((v) => `<sup>${v.v}</sup> ${escHtml(v.t)}`)
    .join(" ");
}

/** Vizinhos de leitura, atravessando fronteiras de livro (como no leitor). */
function neighbors(bi: number, ch: number) {
  const b = BOOKS[bi];
  const prev =
    ch > 1 ? { bi, ch: ch - 1 } : bi > 0 ? { bi: bi - 1, ch: BOOKS[bi - 1].chapters } : null;
  const next =
    ch < b.chapters ? { bi, ch: ch + 1 } : bi < BOOKS.length - 1 ? { bi: bi + 1, ch: 1 } : null;
  return { prev, next };
}

const chPath = (bi: number, ch: number) => `/${BOOKS[bi].slug}/${ch}`;

function chapterContent(bi: number, ch: number): string {
  const b = BOOKS[bi];
  const sections = COLUMNS.map((col) => {
    const vs = verses(col.lang, b.file, ch);
    if (vs.length === 0) return "";
    const langAttr = col.latin ? ' lang="la"' : "";
    return (
      `<section${langAttr}>` +
      `<h2${col.latin ? ' lang="pt-BR"' : ""}>${escHtml(col.label)}</h2>` +
      `<p>${versesToProse(vs)}</p>` +
      `</section>`
    );
  }).join("");

  const { prev, next } = neighbors(bi, ch);
  const rel =
    `<nav class="ssr-rel" aria-label="Capítulo anterior e próximo">` +
    (prev
      ? `<a rel="prev" href="${chPath(prev.bi, prev.ch)}">‹ ${escHtml(BOOKS[prev.bi].pt)} ${prev.ch}</a>`
      : "") +
    (next
      ? `<a rel="next" href="${chPath(next.bi, next.ch)}">${escHtml(BOOKS[next.bi].pt)} ${next.ch} ›</a>`
      : "") +
    `</nav>`;

  const chapters =
    `<nav class="ssr-chapters" aria-label="Capítulos de ${escAttr(b.pt)}">` +
    Array.from({ length: b.chapters }, (_, k) => k + 1)
      .map((c) => `<a href="${chPath(bi, c)}"${c === ch ? ' aria-current="page"' : ""}>${c}</a>`)
      .join("") +
    `</nav>`;

  return (
    `<main class="ssr" id="ssr">` +
    `<article>` +
    `<nav class="ssr-crumb" aria-label="Trilha"><a href="/">Codex Sacræ</a> › ${escHtml(b.pt)}</nav>` +
    `<h1>${escHtml(b.pt)} ${ch}</h1>` +
    `<p class="ssr-sub"><span lang="la">${escHtml(b.la)} ${ch}</span> — Vulgata Clementina e tradução de Matos Soares</p>` +
    sections +
    rel +
    chapters +
    `</article>` +
    `</main>`
  );
}

/* ── Metadados por página ──────────────────────────────────*/

function chapterMeta(b: BookDef, ch: number) {
  const title = `${b.pt} ${ch} — Vulgata e Matos Soares · Codex Sacræ`;
  const first = verses("pt", b.file, ch)[0]?.t ?? verses("la", b.file, ch)[0]?.t ?? "";
  const snippet = first.length > 110 ? `${first.slice(0, 110).trimEnd()}…` : first;
  const desc =
    `${b.pt} ${ch} em latim (Vulgata Clementina) e português (tradução de Matos Soares), ` +
    `lado a lado.${snippet ? ` “${snippet}”` : ""}`;
  const canonical = `${SITE_URL}${chPath(BOOKS.indexOf(b), ch)}`;
  return { title, desc, canonical };
}

/* ── Injeção no molde HTML ─────────────────────────────────*/

const SSR_STYLE =
  `<style id="ssr-style">` +
  `.ssr{max-width:760px;margin:0 auto;padding:2.5rem 1.25rem;` +
  `font-family:"EB Garamond",Georgia,serif;color:#e8e2d4;background:#0a0a0f;` +
  `line-height:1.7}.ssr h1{font-family:"Cinzel",serif;font-size:1.9rem;margin:.2em 0}` +
  `.ssr h2{font-family:"Cinzel",serif;font-size:.8rem;letter-spacing:.18em;` +
  `text-transform:uppercase;color:#d8b366;margin:2rem 0 .6rem}.ssr sup{color:#d8b366;` +
  `font-size:.62em;margin-right:.15em}.ssr section[lang=la] p{font-style:italic;color:#c9c1ad}` +
  `.ssr .ssr-sub{color:#9a927f;margin:0 0 1rem}.ssr nav a{color:#d8b366;margin-right:.6rem;` +
  `text-decoration:none}.ssr-chapters a{display:inline-block;min-width:1.6em;text-align:center}` +
  `.ssr-crumb,.ssr-rel,.ssr-chapters{font-family:"Cinzel",serif;font-size:.72rem}` +
  `.ssr-crumb{color:#9a927f;margin-bottom:1.5rem}.ssr-rel{margin:2rem 0 1rem}` +
  // O React substitui #root ao montar; escondemos o SSR se o JS assumir, mas
  // ele permanece para crawlers e navegação sem JavaScript.
  `</style>`;

function applyTemplate(
  template: string,
  content: string,
  meta: { title: string; desc: string; canonical: string },
): string {
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(meta.title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?>/,
    `<meta name="description" content="${escAttr(meta.desc)}" />`,
  );
  html = html.replace(
    /<link\s+rel="canonical"[\s\S]*?>/,
    `<link rel="canonical" href="${escAttr(meta.canonical)}" />`,
  );
  if (!html.includes('id="ssr-style"')) html = html.replace("</head>", `${SSR_STYLE}</head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
  return html;
}

function writeHtml(relDir: string, html: string): void {
  const dir = path.join(DIST, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "index.html"), html);
}

/* ── Home / índice navegável ───────────────────────────────*/

function homeContent(): string {
  const group = (t: "AT" | "NT", title: string) =>
    `<section><h2>${title}</h2><ul class="ssr-books">` +
    BOOKS.filter((b) => b.testament === t)
      .map((b) => `<li><a href="/${b.slug}/1">${escHtml(b.pt)} <span lang="la">${escHtml(b.la)}</span></a></li>`)
      .join("") +
    `</ul></section>`;

  return (
    `<main class="ssr" id="ssr"><article>` +
    `<h1>Codex Sacræ</h1>` +
    `<p class="ssr-sub">A Vulgata Latina e a tradução de Matos Soares em paralelo, ` +
    `com a Ave-Maria e a King James — os 73 livros do cânon católico, capítulo a capítulo.</p>` +
    group("AT", "Vetus Testamentum") +
    group("NT", "Novum Testamentum") +
    `</article></main>`
  );
}

/* ── sitemap & robots ──────────────────────────────────────*/

function writeSitemap(): number {
  const urls: string[] = [`<url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>`];
  for (let bi = 0; bi < BOOKS.length; bi++) {
    for (let ch = 1; ch <= BOOKS[bi].chapters; ch++) {
      urls.push(`<url><loc>${SITE_URL}${chPath(bi, ch)}</loc><changefreq>yearly</changefreq></url>`);
    }
  }
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>\n`;
  writeFileSync(path.join(DIST, "sitemap.xml"), xml);
  return urls.length;
}

function writeRobots(): void {
  writeFileSync(
    path.join(DIST, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  );
}

/* ── Execução ──────────────────────────────────────────────*/

const template = readFileSync(path.join(DIST, "index.html"), "utf8");

let pages = 0;
for (let bi = 0; bi < BOOKS.length; bi++) {
  const b = BOOKS[bi];
  for (let ch = 1; ch <= b.chapters; ch++) {
    const meta = chapterMeta(b, ch);
    const html = applyTemplate(template, chapterContent(bi, ch), meta);
    writeHtml(path.join(b.slug, String(ch)), html);
    pages++;
  }
}

// Home: sobrescreve dist/index.html com índice navegável.
writeFileSync(
  path.join(DIST, "index.html"),
  applyTemplate(template, homeContent(), {
    title: "Codex Sacræ — Vulgata Latina e Matos Soares em paralelo",
    desc:
      "Vulgata Latina e a tradução de Matos Soares em paralelo, com a Ave-Maria e a King James. " +
      "Todos os 73 livros do cânon católico, capítulo a capítulo.",
    canonical: `${SITE_URL}/`,
  }),
);

const sitemapUrls = writeSitemap();
writeRobots();

console.log(`Pré-renderizado: ${pages} capítulos + home · sitemap ${sitemapUrls} URLs · robots.txt`);
console.log(`  SITE_URL = ${SITE_URL}`);
