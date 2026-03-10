# Can U See Me

Dependency graph visualizer for VS Code. Mappa le dipendenze tra file di un progetto TypeScript/JavaScript e le visualizza come grafo interattivo.

## Sviluppo

### Prerequisiti

- Node.js 20+
- VS Code

### Setup

```bash
npm install
```

### Avviare l'ambiente di sviluppo

Servono due terminali in parallelo.

**Terminale 1 — Extension Host:**
```bash
npm run watch
```
Compila TypeScript in `./out` e resta in ascolto delle modifiche.

**Terminale 2 — Webview:**
```bash
npm run bundle-webview:watch
```
Bundla `src/webview/index.ts` + Cytoscape in `media/webview.js` e resta in ascolto.

Poi in VS Code premi **F5** per aprire l'**Extension Development Host** (una nuova finestra VS Code con l'estensione caricata).

### Testare l'estensione

Nella finestra Extension Development Host:

```
Ctrl+Shift+P → "Can U See Me: Open Dependency Graph"
```

### Build di produzione

```bash
npm run vscode:prepublish
```

Esegue `tsc` + `esbuild --minify` in sequenza.

### Type check webview

Il codice in `src/webview/` non è compilato da `tsc` (ci pensa esbuild), ma puoi fare il type check separatamente:

```bash
npx tsc -p tsconfig.webview.json
```

## Struttura

```
src/
  extension.ts          # entry point, registra i comandi
  GraphPanel.ts         # crea e gestisce la Webview
  webview/
    index.ts            # codice che gira nel browser (Cytoscape)
media/
  webview.js            # bundle generato da esbuild, non editare
out/
  ...                   # output tsc, non editare
```

Vedi `ARCHITECTURE.md` per le decisioni tecniche.
