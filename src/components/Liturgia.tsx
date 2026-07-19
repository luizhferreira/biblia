import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dateKey,
  fetchLiturgia,
  type Leitura,
  type Liturgia,
  type Salmo,
} from "../lib/liturgiaApi";
import {
  ATO_PENITENCIAL,
  GLORIA,
  KYRIE,
  SAUDACAO,
  SINAL_DA_CRUZ,
  type Parte,
} from "../data/missa";
import { Cross, Fleuron } from "./ornaments";

/* Cores litúrgicas → estilo do selo */
const COR_ESTILO: Record<string, string> = {
  verde: "border-emerald-700/60 bg-emerald-950/60 text-emerald-200",
  branco: "border-stone-400/60 bg-stone-200/10 text-stone-100",
  vermelho: "border-red-700/60 bg-red-950/60 text-red-200",
  roxo: "border-purple-700/60 bg-purple-950/60 text-purple-200",
  rosa: "border-pink-600/60 bg-pink-950/60 text-pink-200",
  preto: "border-stone-600/60 bg-stone-950/80 text-stone-300",
  azul: "border-blue-700/60 bg-blue-950/60 text-blue-200",
};

/* Limites de navegação: a API cobre um intervalo razoável de anos */
const MIN_ANO = 2020;
const MAX_ANO = 2030;

function clampDate(d: Date): Date {
  if (d.getFullYear() < MIN_ANO) return new Date(MIN_ANO, 0, 1);
  if (d.getFullYear() > MAX_ANO) return new Date(MAX_ANO, 11, 31);
  return d;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return clampDate(c);
}

function fmtLong(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LiturgiaView() {
  const [date, setDate] = useState(() => clampDate(new Date()));
  const [lit, setLit] = useState<Liturgia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const isToday = dateKey(date) === dateKey(new Date());

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetchLiturgia(date, ctrl.signal)
      .then((r) => {
        setLit(r.liturgia);
        setFromCache(r.fromCache);
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name === "AbortError") return;
        setLit(null);
        setError(
          "Não foi possível carregar a liturgia. Verifique sua conexão e tente novamente.",
        );
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [date, reloadTick]);

  const onDateInput = useCallback((v: string) => {
    // valida AAAA-MM-DD vindo do <input type="date">
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    const [y, m, d] = v.split("-").map(Number);
    const nd = new Date(y, m - 1, d);
    if (Number.isNaN(nd.getTime())) return;
    setDate(clampDate(nd));
  }, []);

  const corClass = useMemo(() => {
    const key = (lit?.cor ?? "").trim().toLowerCase();
    return COR_ESTILO[key] ?? "border-[#5a4a24] bg-[#1b170e] text-[#d8b366]";
  }, [lit?.cor]);

  return (
    <main className="frame-gold relative flex-1 overflow-y-auto rounded-md bg-[#0d0b07]/80 md:h-[calc(100vh-2rem)]">
      {/* ── Barra de data ─────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-[#332a16] bg-[#100e08]/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setDate((d) => addDays(d, -1))}
            className="rounded border border-[#5a4a24] bg-[#1b170e] px-3 py-1.5 text-[#d8b366] transition hover:bg-[#251f12]"
            aria-label="Dia anterior"
          >
            ‹
          </button>
          <input
            type="date"
            value={dateKey(date)}
            min={`${MIN_ANO}-01-01`}
            max={`${MAX_ANO}-12-31`}
            onChange={(e) => onDateInput(e.target.value)}
            className="font-display rounded border border-[#5a4a24] bg-[#1b170e] px-3 py-1.5 text-sm text-[#e8dfc8] outline-none [color-scheme:dark]"
            aria-label="Escolher data"
          />
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            className="rounded border border-[#5a4a24] bg-[#1b170e] px-3 py-1.5 text-[#d8b366] transition hover:bg-[#251f12]"
            aria-label="Próximo dia"
          >
            ›
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(clampDate(new Date()))}
              className="font-display rounded border border-[#8a6c31] bg-[#2a2110] px-3 py-1.5 text-xs uppercase tracking-widest text-[#f0d693] transition hover:bg-[#332a16]"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* ── Cabeçalho do dia ──────────────────── */}
      <div className="px-6 pt-6 text-center">
        <p className="text-xs capitalize text-[#9a8d6f]">{fmtLong(date)}</p>
        <h2 className="font-display gold-text mt-1 text-xl sm:text-2xl">
          {lit?.liturgia ?? "Liturgia do dia"}
        </h2>
        {lit?.cor && (
          <span
            className={`font-display mt-2 inline-block rounded-full border px-3 py-0.5 text-[0.6rem] uppercase tracking-[0.25em] ${corClass}`}
          >
            Cor litúrgica · {lit.cor}
          </span>
        )}
        {fromCache && (
          <p className="mt-2 text-[0.65rem] text-[#6b5c3a]">
            Sem conexão — exibindo a última versão salva neste dispositivo.
          </p>
        )}
        <div className="mt-3 flex justify-center text-[#8a6c31]">
          <Fleuron className="h-4 w-28" />
        </div>
      </div>

      {/* ── Estados ───────────────────────────── */}
      {loading && <Mensagem>Preparando o altar…</Mensagem>}
      {error && !loading && (
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <Cross className="candle h-6 w-6 text-[#a24a3f]" />
          <p className="font-display text-sm uppercase tracking-[0.25em] text-[#c07a70]">
            {error}
          </p>
          <button
            onClick={() => setReloadTick((t) => t + 1)}
            className="font-display rounded border border-[#5a4a24] px-4 py-1.5 text-[#d8b366] transition hover:bg-[#1b170e]"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Conteúdo ──────────────────────────── */}
      {!loading && !error && lit && (
        <div className="fadein mx-auto max-w-3xl px-4 pb-10 sm:px-6">
          <TituloSecao>Ritos Iniciais</TituloSecao>

          {lit.antifonas.entrada && (
            <Bloco titulo="Antífona de entrada">
              <Texto italic>{lit.antifonas.entrada}</Texto>
            </Bloco>
          )}

          <ParteOrdinario parte={SINAL_DA_CRUZ} />
          <ParteOrdinario parte={SAUDACAO} abreFechado />
          <ParteOrdinario parte={ATO_PENITENCIAL} abreFechado />
          <ParteOrdinario parte={KYRIE} abreFechado />
          <ParteOrdinario parte={GLORIA} abreFechado />

          {lit.oracoes.coleta && (
            <Bloco titulo="Oração do dia (Coleta)">
              <Texto>{lit.oracoes.coleta}</Texto>
              <Resposta>Amém.</Resposta>
            </Bloco>
          )}

          <TituloSecao>Liturgia da Palavra</TituloSecao>

          {lit.leituras.primeiraLeitura.map((l, i) => (
            <LeituraBloco key={`pl-${i}`} rotulo="Primeira Leitura" leitura={l} />
          ))}
          {lit.leituras.salmo.map((s, i) => (
            <SalmoBloco key={`sl-${i}`} salmo={s} />
          ))}
          {lit.leituras.segundaLeitura.map((l, i) => (
            <LeituraBloco key={`sg-${i}`} rotulo="Segunda Leitura" leitura={l} />
          ))}
          {lit.leituras.evangelho.map((l, i) => (
            <LeituraBloco key={`ev-${i}`} rotulo="Evangelho" leitura={l} evangelho />
          ))}
          {lit.leituras.extras.map((e, i) => (
            <Bloco key={`lx-${i}`} titulo={e.titulo || "Leitura"}>
              <Texto>{e.texto}</Texto>
            </Bloco>
          ))}

          <TituloSecao>Liturgia Eucarística</TituloSecao>

          {lit.oracoes.oferendas && (
            <Bloco titulo="Oração sobre as oferendas">
              <Texto>{lit.oracoes.oferendas}</Texto>
              <Resposta>Amém.</Resposta>
            </Bloco>
          )}

          <TituloSecao>Rito da Comunhão</TituloSecao>

          {lit.antifonas.comunhao && (
            <Bloco titulo="Antífona da comunhão">
              <Texto italic>{lit.antifonas.comunhao}</Texto>
            </Bloco>
          )}

          {lit.oracoes.comunhao && (
            <Bloco titulo="Oração depois da comunhão">
              <Texto>{lit.oracoes.comunhao}</Texto>
              <Resposta>Amém.</Resposta>
            </Bloco>
          )}

          {lit.oracoes.extras.map((e, i) => (
            <Bloco key={`ox-${i}`} titulo={e.titulo || "Oração"}>
              <Texto>{e.texto}</Texto>
            </Bloco>
          ))}

          <footer className="mt-10 border-t border-[#332a16] pt-5 text-center text-[0.7rem] text-[#6b5c3a]">
            Textos próprios do dia obtidos de{" "}
            <a
              href="https://liturgia.up.railway.app"
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-[#5a4a24] hover:text-[#d8b366]"
            >
              liturgia.up.railway.app
            </a>
            . Partes do Ordinário conforme o Missal Romano (CNBB). Em caso de
            divergência, vale sempre o Missal.
          </footer>
        </div>
      )}
    </main>
  );
}

/* ── Sub-componentes ───────────────────────────────────────── */

function TituloSecao({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 mt-10 text-center">
      <h3 className="font-display gilt text-lg uppercase tracking-[0.25em]">
        {children}
      </h3>
      <div className="mt-1 flex justify-center text-[#8a6c31]">
        <Fleuron className="h-3 w-20 opacity-70" />
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-md border border-[#241d10] bg-[#12100a]/70 px-5 py-4">
      <h4 className="font-display mb-2 text-[0.7rem] uppercase tracking-[0.3em] text-[#c99f4c]">
        {titulo}
      </h4>
      {children}
    </section>
  );
}

/* Destaca números de versículo colados ao texto (ex.: "26o Espírito")
 * exibindo-os como sobrescrito, no estilo da aba Bíblia. */
function renderComVersiculos(texto: string): React.ReactNode[] {
  const re = /(^|[\s(“‘"'—–-])(\d{1,3})(?=[A-Za-zÀ-ÖØ-öø-ÿ“‘"'])/gm;
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(texto)) !== null) {
    const inicioNum = m.index + m[1].length;
    partes.push(texto.slice(ultimo, inicioNum));
    partes.push(
      <sup
        key={key++}
        className="font-display mr-0.5 align-super text-[0.65rem] font-semibold text-[#c99f4c]"
      >
        {m[2]}
      </sup>,
    );
    ultimo = inicioNum + m[2].length;
  }
  partes.push(texto.slice(ultimo));
  return partes;
}

function TextoVersiculado({ children }: { children: string }) {
  return (
    <p className="font-serif-read whitespace-pre-line text-[1.02rem] leading-relaxed text-[#e8dfc8]">
      {renderComVersiculos(children)}
    </p>
  );
}

function Texto({
  children,
  italic = false,
}: {
  children: React.ReactNode;
  italic?: boolean;
}) {
  return (
    <p
      className={`font-serif-read whitespace-pre-line text-[1.02rem] leading-relaxed text-[#e8dfc8] ${
        italic ? "italic text-[#d9cba3]" : ""
      }`}
    >
      {children}
    </p>
  );
}

function Resposta({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-serif-read mt-2 text-[1.02rem] font-semibold text-[#f0d693]">
      <span className="font-display mr-2 text-[0.7rem] text-[#8a6c31]">℟.</span>
      {children}
    </p>
  );
}

function LeituraBloco({
  rotulo,
  leitura,
  evangelho = false,
}: {
  rotulo: string;
  leitura: Leitura;
  evangelho?: boolean;
}) {
  return (
    <Bloco titulo={`${rotulo}${leitura.referencia ? ` · ${leitura.referencia}` : ""}`}>
      {leitura.titulo && (
        <p className="font-serif-read mb-2 italic text-[#d9cba3]">
          {leitura.titulo}
        </p>
      )}
      {evangelho && (
        <Resposta>Glória a vós, Senhor!</Resposta>
      )}
      <TextoVersiculado>{leitura.texto}</TextoVersiculado>
      <p className="font-serif-read mt-3 text-[#d9cba3]">
        {evangelho ? "Palavra da Salvação." : "Palavra do Senhor."}
      </p>
      <Resposta>
        {evangelho ? "Glória a vós, Senhor!" : "Graças a Deus!"}
      </Resposta>
    </Bloco>
  );
}

function SalmoBloco({ salmo }: { salmo: Salmo }) {
  return (
    <Bloco
      titulo={`Salmo Responsorial${salmo.referencia ? ` · ${salmo.referencia}` : ""}`}
    >
      {salmo.refrao && <Resposta>{salmo.refrao}</Resposta>}
      <div className="mt-2">
        <TextoVersiculado>{salmo.texto}</TextoVersiculado>
      </div>
    </Bloco>
  );
}

/* Parte do Ordinário com alternativas (abre/fecha e alterna fórmulas) */
function ParteOrdinario({
  parte,
  abreFechado = false,
}: {
  parte: Parte;
  abreFechado?: boolean;
}) {
  const [aberto, setAberto] = useState(!abreFechado);
  const [forma, setForma] = useState(0);
  const atual = parte.formas[Math.min(forma, parte.formas.length - 1)];

  return (
    <section className="mb-4 rounded-md border border-[#241d10] bg-[#12100a]/70">
      <button
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        aria-expanded={aberto}
      >
        <span className="font-display text-[0.7rem] uppercase tracking-[0.3em] text-[#c99f4c]">
          {parte.titulo}
        </span>
        <span className="text-[#8a6c31]">{aberto ? "▾" : "▸"}</span>
      </button>

      {aberto && (
        <div className="px-5 pb-4">
          {parte.nota && (
            <p className="mb-3 text-[0.7rem] italic text-[#6b5c3a]">{parte.nota}</p>
          )}
          {parte.formas.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {parte.formas.map((f, i) => (
                <button
                  key={f.label}
                  onClick={() => setForma(i)}
                  className={`font-display rounded border px-2.5 py-1 text-[0.6rem] uppercase tracking-widest transition ${
                    i === forma
                      ? "border-[#8a6c31] bg-[#2a2110] text-[#f0d693]"
                      : "border-[#3a3018] text-[#6b5c3a] hover:text-[#a89a76]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {atual.linhas.map((l, i) =>
            l.voz === "R" ? (
              <p key={i} className="mb-2 text-[0.75rem] italic text-[#9a8d6f]">
                {l.texto}
              </p>
            ) : l.voz === "T" ? (
              <Resposta key={i}>{l.texto}</Resposta>
            ) : (
              <p
                key={i}
                className="font-serif-read mt-2 text-[1.02rem] leading-relaxed text-[#e8dfc8]"
              >
                <span className="font-display mr-2 text-[0.7rem] text-[#8a6c31]">℣.</span>
                {l.texto}
              </p>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function Mensagem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <Cross className="candle h-6 w-6 text-[#8a6c31]" />
      <p className="font-display text-sm uppercase tracking-[0.25em] text-[#a89a76]">
        {children}
      </p>
    </div>
  );
}
