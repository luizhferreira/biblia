import type { BookDef } from "../data/books";
import type { Verse } from "./bibleApi";
import { loadJson, type DataBook } from "./dataFetch";

/**
 * Tradução Ave-Maria (Editora Ave-Maria).
 *
 * A fonte é um único JSON de ~6,6 MB (`src/lib/bibliaAveMaria.json`), com os
 * livros nomeados por extenso e agrupados por testamento. `scripts/build-data.ts`
 * resolve a correspondência com `BOOKS`, limpa o texto e grava um arquivo por
 * livro em `public/data/av/`; aqui só buscamos o livro em questão (~90 kB em
 * média, 260 kB nos Salmos) na primeira vez que ele é aberto.
 */

/**
 * Devolve os versículos de um capítulo na tradução Ave-Maria.
 * Lança erro descritivo quando a fonte falha, para que a interface possa dizer
 * o motivo em vez de só ficar vazia.
 */
export async function fetchAveMariaChapter(
  book: BookDef,
  chapter: number,
): Promise<Verse[]> {
  let data: DataBook | null;
  try {
    data = await loadJson<DataBook>(`av/${book.file}.json`);
  } catch (err) {
    throw new Error(`Ave-Maria: falha ao ler a fonte local (${err}).`);
  }

  if (!data) throw new Error(`Ave-Maria: livro "${book.pt}" ausente na fonte.`);

  return (data[String(chapter)] ?? []).map((v) => ({ verse: v.v, text: v.t }));
}
