/**
 * Roteamento por URL real: `/{slug}/{capítulo}` (ex.: `/joao/3`).
 *
 * O leitor é uma SPA, mas cada capítulo tem uma URL de verdade — pré-renderizada
 * no build (`scripts/prerender.ts`) para o Google, e mantida em sincronia aqui
 * via History API enquanto o usuário navega. `parsePath` lê o estado inicial da
 * URL; `chapterPath` monta a URL a partir do estado.
 */
import { BOOKS, BOOK_BY_SLUG } from "../data/books";

export interface RouteState {
  bookIndex: number;
  chapter: number;
}

/** Prefixo de montagem do site, sem barra final (normalmente ""). */
function base(): string {
  return import.meta.env.BASE_URL.replace(/\/+$/, "");
}

/**
 * Resolve um pathname (`/joao/3`) em livro+capítulo, ou `null` se não casar com
 * nenhum livro — deixando o chamador cair no último lido / padrão.
 */
export function parsePath(pathname: string): RouteState | null {
  let p = pathname;
  const b = base();
  if (b && p.startsWith(b)) p = p.slice(b.length);

  const parts = p.replace(/^\/+|\/+$/g, "").split("/");
  const slug = decodeURIComponent(parts[0] ?? "").toLowerCase();
  if (!slug) return null;

  const bookIndex = BOOK_BY_SLUG.get(slug);
  if (bookIndex === undefined) return null;

  const raw = parts[1] ? Number.parseInt(parts[1], 10) : 1;
  const max = BOOKS[bookIndex].chapters;
  const chapter = Number.isFinite(raw) ? Math.min(Math.max(1, raw), max) : 1;
  return { bookIndex, chapter };
}

/** Monta o pathname canônico de um capítulo. */
export function chapterPath(bookIndex: number, chapter: number): string {
  return `${base()}/${BOOKS[bookIndex].slug}/${chapter}`;
}
