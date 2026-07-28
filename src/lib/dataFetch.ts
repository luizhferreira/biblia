/**
 * Acesso aos JSONs estáticos gerados por `scripts/build-data.ts` em
 * `public/data/`.
 *
 * Os dados ficam fora do bundle de propósito: são buscados sob demanda (só o
 * livro que está sendo lido), passam por `JSON.parse` nativo em vez de serem
 * avaliados como JavaScript, e ganham cache HTTP do navegador entre visitas.
 * Em memória, cada arquivo é buscado uma única vez por sessão.
 */

/** Verso no formato compacto do build: `v`ersículo e `t`exto (já limpo). */
export interface DataVerse {
  v: number;
  t: string;
}

/** Um livro: capítulo (como string) → versículos. */
export type DataBook = Record<string, DataVerse[]>;

/** Resolve um caminho relativo a `public/data/`, respeitando o `base` do Vite. */
function url(rel: string): string {
  return new URL(`${import.meta.env.BASE_URL}data/${rel}`, document.baseURI).href;
}

const cache = new Map<string, Promise<unknown>>();

/**
 * Busca e memoriza `public/data/<rel>`.
 *
 * Devolve `null` quando o arquivo não existe (404) — dado ausente é um estado
 * normal, não um erro. Falhas de rede ou JSON inválido são lançadas, e nesse
 * caso a entrada sai do cache para permitir nova tentativa.
 */
export function loadJson<T>(rel: string): Promise<T | null> {
  const hit = cache.get(rel);
  if (hit) return hit as Promise<T | null>;

  const p = fetch(url(rel))
    .then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} em data/${rel}`);
      return res.json() as Promise<T>;
    })
    .catch((err) => {
      cache.delete(rel); // permite nova tentativa
      throw err;
    });

  cache.set(rel, p);
  return p;
}
