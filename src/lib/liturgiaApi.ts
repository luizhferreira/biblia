/* ── API da Liturgia Diária (liturgia.up.railway.app) ─────────
 * Fornece as partes PRÓPRIAS do dia: leituras, salmo, orações,
 * antífonas e a cor litúrgica. As partes fixas (Ordinário da
 * Missa) vivem em ../data/missa.ts.
 */

export interface Leitura {
  referencia: string;
  titulo?: string;
  texto: string;
}

export interface Salmo {
  referencia: string;
  refrao: string;
  texto: string;
}

export interface OracaoExtra {
  titulo: string;
  texto: string;
}

export interface Liturgia {
  data: string; // "DD/MM/AAAA"
  liturgia: string; // nome da celebração
  cor: string; // "Verde" | "Branco" | "Vermelho" | "Roxo" | "Rosa" ...
  oracoes: {
    coleta: string;
    oferendas: string;
    comunhao: string;
    extras: OracaoExtra[];
  };
  leituras: {
    primeiraLeitura: Leitura[];
    salmo: Salmo[];
    segundaLeitura: Leitura[];
    evangelho: Leitura[];
    extras: OracaoExtra[];
  };
  antifonas: {
    entrada: string;
    comunhao: string;
  };
}

const BASE = "https://liturgia.up.railway.app/v2/";
const CACHE_PREFIX = "liturgia:";
const TIMEOUT_MS = 12000;

/** Chave AAAA-MM-DD (estável, independente de fuso) a partir de um Date. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normaliza a resposta da API preenchendo campos ausentes com padrões seguros. */
function normalize(raw: unknown): Liturgia {
  const r = (raw ?? {}) as Record<string, any>;
  const oracoes = (r.oracoes ?? {}) as Record<string, any>;
  const leituras = (r.leituras ?? {}) as Record<string, any>;
  const antifonas = (r.antifonas ?? {}) as Record<string, any>;

  // Sanitiza: só aceita strings, remove qualquer marcação HTML e normaliza espaços.
  const asStr = (v: unknown) =>
    typeof v === "string"
      ? v.replace(/<[^>]*>/g, "").replace(/[ \t]+/g, " ").trim()
      : "";

  const asLeitura = (v: unknown): Leitura | null => {
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const texto = asStr(o.texto);
    if (!texto) return null;
    return { referencia: asStr(o.referencia), titulo: asStr(o.titulo) || undefined, texto };
  };

  const asSalmo = (v: unknown): Salmo | null => {
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const texto = asStr(o.texto);
    if (!texto) return null;
    return { referencia: asStr(o.referencia), refrao: asStr(o.refrao), texto };
  };

  const asExtra = (v: unknown): OracaoExtra | null => {
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const texto = asStr(o.texto);
    if (!texto) return null;
    return { titulo: asStr(o.titulo), texto };
  };

  const list = <T,>(v: unknown, map: (x: unknown) => T | null): T[] =>
    Array.isArray(v) ? v.map(map).filter((x): x is T => x !== null).slice(0, 12) : [];

  return {
    data: asStr(r.data),
    liturgia: asStr(r.liturgia) || "Liturgia do dia",
    cor: asStr(r.cor),
    oracoes: {
      coleta: asStr(oracoes.coleta),
      oferendas: asStr(oracoes.oferendas),
      comunhao: asStr(oracoes.comunhao),
      extras: list(oracoes.extras, asExtra),
    },
    leituras: {
      primeiraLeitura: list(leituras.primeiraLeitura, asLeitura),
      salmo: list(leituras.salmo, asSalmo),
      segundaLeitura: list(leituras.segundaLeitura, asLeitura),
      evangelho: list(leituras.evangelho, asLeitura),
      extras: list(leituras.extras, asExtra),
    },
    antifonas: {
      entrada: asStr(antifonas.entrada),
      comunhao: asStr(antifonas.comunhao),
    },
  };
}

function readCache(key: string): Liturgia | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as Liturgia) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: Liturgia): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* localStorage indisponível/cheio — ignora silenciosamente */
  }
}

export interface FetchLiturgiaResult {
  liturgia: Liturgia;
  fromCache: boolean;
}

/**
 * Busca a liturgia de uma data. Usa cache local como fallback quando
 * a rede falha, para o app continuar útil offline.
 */
export async function fetchLiturgia(
  date: Date,
  signal?: AbortSignal,
): Promise<FetchLiturgiaResult> {
  const key = dateKey(date);
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const ano = String(date.getFullYear());
  const url = `${BASE}?dia=${dia}&mes=${mes}&ano=${ano}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  // repassa o abort externo (troca de data / desmontagem) ao controlador interno
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const liturgia = normalize(data);
    writeCache(key, liturgia);
    return { liturgia, fromCache: false };
  } catch (err) {
    // Se foi cancelado pelo chamador (não por timeout), propaga o abort.
    if (signal?.aborted && (err as Error)?.name === "AbortError") {
      throw err;
    }
    const cached = readCache(key);
    if (cached) return { liturgia: cached, fromCache: true };
    throw err instanceof Error ? err : new Error("Falha ao carregar a liturgia.");
  } finally {
    clearTimeout(timer);
  }
}
