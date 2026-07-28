# Codex Sacræ — Performance Lighthouse > 95

Data: 2026-07-28

## Objetivo

Levar a categoria **Performance** do Lighthouse (perfil mobile, build de produção)
de 79 para acima de 95, sem alterar o que o leitor vê na página.

Categorias fora do escopo por decisão explícita: SEO (82) e Best Practices (96)
permanecem como estão. Acessibilidade recebe uma correção pontual de contraste
(item 5) porque a mudança de paleta foi aprovada, mas não é o alvo da meta.

## Baseline medida

Lighthouse 12.x, `--preset` padrão (mobile, throttling simulado), Chrome headless,
contra `vite preview` servindo `dist/` do build de produção.

| Categoria | Score |
|---|---|
| Performance | 79 |
| Acessibilidade | 95 |
| Best Practices | 96 |
| SEO | 82 |

Métricas:

| Métrica | Valor | Score |
|---|---|---|
| First Contentful Paint | 2,7 s | 60 |
| Largest Contentful Paint | 3,3 s | 69 |
| Cumulative Layout Shift | 0,16 | 73 |
| Speed Index | 4,1 s | 78 |
| Total Blocking Time | 0 ms | 100 |

O relatório JSON da baseline não é versionado; é regerado sob demanda.

## Diagnóstico

**LCP — cadeia de rede.** A cadeia crítica mais longa dura 1187 ms e termina em
`api.getbible.net`. O efeito de carga do capítulo em `src/App.tsx` faz
`Promise.allSettled` sobre quatro fontes e só chama `setRows` quando todas
resolvem. As preferências padrão exibem apenas a coluna portuguesa, que vem de
`public/data/pt/<livro>.json` (mesma origem, pronta em ~450 ms). O leitor padrão,
portanto, espera ~740 ms a mais por texto que não vai ler.

**FCP — CSS bloqueante de terceiro.** O `<link>` do Google Fonts custa 872 ms de
bloqueio de renderização e encadeia dois woff2 em `fonts.gstatic.com`
(EB Garamond 44 KB, Cinzel 26 KB). O CSS próprio bloqueia mais 162 ms.

**CLS 0,16 — um único elemento.** O `<p>` de créditos no fim do artigo
(`src/App.tsx`, seletor `article.mx-auto > p.mt-6`) é pintado enquanto o capítulo
carrega e é empurrado para baixo quando os versículos entram no fluxo.

**JS não usado — 32 KiB.** `LiturgiaView` e `CatenaPanel` são importados
estaticamente. Nenhum dos dois está na tela inicial: a Liturgia é outra aba e o
painel da Catena só abre ao clicar num versículo comentado.

**Contraste.** Vinte elementos reprovam em `color-contrast`. Todos usam
`--faint` (`#6b6455`), com razão de 3,04–3,31:1 contra `--sink` (`#0e0d0b`) e
`--raise` (`#1a1714`). O mínimo WCAG AA para texto pequeno é 4,5:1.

## Mudanças

### 1. Pintura progressiva do capítulo

`src/App.tsx`, efeito de carga do capítulo.

As quatro requisições continuam disparando em paralelo — nenhuma fica mais
lenta. O que muda é quando o resultado chega à tela: cada fonte que resolve
atualiza as linhas já mescladas, em vez de todas esperarem a mais lenta.
`setLoading(false)` passa a ocorrer quando a coluna portuguesa resolve.

Requisitos de corretude:

- O `AbortController` existente continua cancelando a troca de capítulo. Cada
  resolução parcial verifica `ctrl.signal.aborted` antes de tocar em estado.
- `mergeVerses` já aceita qualquer subconjunto de idiomas; a mescla parcial usa a
  mesma função, acumulando as colunas conforme chegam.
- `avNote` continua refletindo a fonte Ave-Maria, agora resolvido isoladamente.
- O estado de erro só aparece se todas as fontes falharem, como hoje.

`index.html` ganha `<link rel="preconnect" href="https://api.getbible.net">`.

### 2. Preload do capítulo padrão

`index.html` ganha `<link rel="preload" as="fetch" crossorigin href="./data/pt/jo.json">`.

Hoje o fetch do texto só começa depois que o bundle carrega e executa — cerca de
370 ms depois do início da navegação. O preload dispara junto com o HTML.

Aceito conscientemente: quem volta ao app lendo outro livro faz um request extra
de ~35 KB e o Chrome loga um aviso de preload não utilizado. É um aviso, não um
erro, e não afeta nenhuma auditoria pontuada.

### 3. Fontes auto-hospedadas

Arquivos variable woff2 em `public/fonts/`, subsets latin e latin-ext:

- `Cinzel[wght]` — eixo de peso cobre 400–800 num arquivo
- `EBGaramond[wght]` e `EBGaramond-Italic[wght]`
- `UnifrakturMaguntia` (peso único)

`src/index.css` recebe as declarações `@font-face` com `font-display: swap`.
As URLs são relativas ao CSS emitido (`dist/assets/index-*.css` → `../fonts/…`),
o que preserva o `base: "./"` do Vite e o funcionamento em subpasta no GitHub Pages.

`index.html`:

- saem os dois `<link rel="preconnect">` e o `<link rel="stylesheet">` do Google
- entram `<link rel="preload" as="font" type="font/woff2" crossorigin>` para as
  duas famílias do primeiro paint (EB Garamond regular e Cinzel)
- o CSP perde `https://fonts.googleapis.com` de `style-src` e a diretiva
  `font-src` passa a apontar para `'self'`

### 4. Reserva de altura durante a carga

`src/App.tsx`. O bloco de mensagem de carregamento recebe altura mínima
suficiente para que a altura do artigo durante a carga se aproxime da altura
final, impedindo que o rodapé de créditos se desloque dentro da viewport.

Alvo: CLS ≤ 0,1 (faixa de score 100 na curva do Lighthouse).

### 5. Code-splitting

`src/App.tsx`. `LiturgiaView` e `CatenaPanel` passam a `React.lazy`, envolvidos
em `<Suspense>` com um fallback discreto e coerente com o tema. Ambos já são
renderizados condicionalmente, então nenhuma lógica de exibição muda.

### 6. Contraste

`src/index.css`, tokens dos dois temas escuros.

- `--faint`: `#6b6455` → `#958d76`
- `--mute`: `#8a8270` → `#a89e83`
- `[data-theme="tinta"]`: `--faint` `#9a8f74`, `--mute` `#ab9f80`

O `#8b8370` cogitado inicialmente foi descartado: dá 4,30:1 contra o `--raise`
do tema "tinta", abaixo do mínimo. Os valores acima foram escolhidos por
cálculo de luminância relativa contra os oito fundos dos dois temas; o pior
caso é 4,89:1 (`--faint` sobre `tinta/raise`).

Critério: cada token deve atingir ≥ 4,5:1 contra o fundo mais claro sobre o qual
aparece (`--raise`), verificado por cálculo de luminância relativa WCAG, não a olho.

## Verificação

Nenhuma afirmação de sucesso sem o número na mão.

1. `npm run build`
2. `vite preview` na porta 4173
3. Lighthouse CLI mobile contra `http://localhost:4173/`, mesmo comando da baseline
4. Comparação métrica a métrica com a tabela de baseline acima

Critério de aceite: **Performance ≥ 95**, e nenhuma das outras três categorias
abaixo do valor de baseline.

## Resultado medido

### Ressalva sobre o ambiente

Esta máquina não mede de forma estável. Cinco execuções do **mesmo build**
deram scores de Performance entre 78 e 97, e o `environment.benchmarkIndex`
do Lighthouse — que mede a velocidade da máquina no momento da execução —
caiu de 1254 para 688 ao longo delas, acompanhando o score quase linearmente.
Qualquer número absoluto medido aqui diz mais sobre a carga da máquina do que
sobre o app. Por isso a comparação abaixo é um A/B intercalado: os dois builds
servidos em paralelo (baseline em `.lh-baseline`, novo em `dist`) e medidos
alternadamente, para que a deriva da máquina atinja os dois igualmente.

### A/B intercalado

| versão | benchmarkIndex | Performance | Acessibilidade | FCP | CLS |
|---|---|---|---|---|---|
| baseline A | 1202 | 86 | 95 | 2709 ms | 0 |
| novo A | 612 | 91 | 100 | 1298 ms | 0 |
| baseline B | 962 | 81 | 95 | 2849 ms | 0,160 |
| novo B | 776 | 86 | 100 | 1426 ms | 0 |

O novo build ganhou 5 pontos nos dois pares enquanto rodava em condições de
máquina piores que as da baseline em ambos (612 contra 1202; 776 contra 962).
O FCP caiu para cerca de metade de forma consistente, e o CLS foi a zero.

Em execuções isoladas com a máquina descarregada (benchmarkIndex 1254 e 940),
o novo build marcou **97** e **95**. Sob carga, marca entre 83 e 91. O alvo de
95+ é atingido em condições limpas de medição, mas não pode ser afirmado como
garantido a partir de medições feitas nesta máquina.

### Efeito colateral aceito: TBT

O TBT saiu de 0 ms para ~200–300 ms. Não é regressão de trabalho: na baseline
o app ficava bloqueado esperando `api.getbible.net` e mal renderizava dentro
da janela do trace, então não havia trabalho de main thread a contabilizar.
Agora o capítulo é montado cedo, e montá-lo custa. As mitigações já aplicadas
foram não repintar por colunas ocultas e `content-visibility` na Bibliotheca.

Se for preciso ir além, o próximo suspeito é o parágrafo único do modo "prosa"
com `text-justify` + `hyphens: auto` + `text-wrap: pretty` sobre ~4300 px de
texto — `styleLayout` respondeu por 515 ms do main thread. Mexer nisso degrada
a tipografia do leitor, então não foi feito.

## Verificação funcional

Feita no navegador contra o build de produção:

- capítulo renderiza com capitular, versículos e marcas da Catena
- ligar a coluna latina traz o texto que havia chegado enquanto estava oculta
  (o caminho de risco da pintura progressiva)
- painel da Catena monta sob demanda e carrega o comentário
- aba da Liturgia monta sob demanda
- zero requisições a `fonts.googleapis.com` / `fonts.gstatic.com`
- três woff2 locais carregados, os dois do primeiro paint via preload
- console sem erros

Verificação manual complementar, via preview no navegador: trocar de capítulo,
alternar as quatro colunas, abrir a Liturgia, abrir o painel da Catena. Nenhum
desses caminhos pode regredir — em especial a mescla parcial de colunas e o
cancelamento ao trocar de capítulo rapidamente.
