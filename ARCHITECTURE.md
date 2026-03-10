# Architecture — Can U See Me

## Stack

| Tecnologia | Scopo | Note |
|---|---|---|
| TypeScript | Extension Host | Linguaggio principale, compile-time safety |
| Cytoscape.js | Rendering grafo | Vedi sotto |
| cytoscape-dagre | Layout automatico | Vedi sotto |
| esbuild | Bundle webview | Vedi sotto |
| Regex (v1) | Parser import TS/JS | Sostituibile con Tree-sitter in v2 |

---

## Decisioni architetturali

### Cytoscape.js come renderer

Scelto su React Flow e Sigma.js.

React Flow scartato: nessuna virtualizzazione nativa dei nodi, richiede React nel bundle (+130KB inutili), pensato per workflow editor con pochi nodi — non per dependency graph di progetto.

Sigma.js scartato: ottimo per grafi enormi (WebGL), ma povero di feature per interazione e layout — overkill e sottodotato allo stesso tempo per questo use case.

Cytoscape vince perché: nessuna dipendenza da framework, viewport culling nativo, ecosistema di layout maturo, documentazione eccellente, testato su migliaia di nodi.

### cytoscape-dagre come layout

Il grafo di dipendenze è un DAG (Directed Acyclic Graph). Un layout force-directed generico produce risultati caotici su grafi direzionali. Dagre è progettato specificamente per DAG: produce layout gerarchici leggibili con direzione chiara (chi dipende da chi).

ELK (Eclipse Layout Kernel) è più potente ma più pesante e complesso da integrare. Tenuto come upgrade futuro se dagre si dimostra insufficiente.

### LOD (Level of Detail) basato sullo zoom

Il progetto espone due livelli di visualizzazione:

- **Livello 1 — Project View**: nodi = file, edge = import tra file
- **Livello 2 — File View**: nodi = funzioni/classi/tipi, edge = riferimenti interni

La transizione tra livelli avviene tramite zoom + click, non sono due schermate separate. Cytoscape gestisce eventi di zoom che permettono di modificare il rendering in base al livello corrente.

### Nessun framework nella webview

La webview è HTML + JS vanilla + Cytoscape. Nessun React, Vue, Svelte.

Motivazione: la webview è un layer di presentazione thin — riceve dati dall'Extension Host via `postMessage` e li renderizza. Non ha logica applicativa propria che giustifichi un framework. Aggiungere React significherebbe +260KB di bundle per gestire essenzialmente un canvas.

### Separazione Extension Host / Webview

Tutta la logica pesante (scansione file, parsing import, costruzione grafo dati) vive nell'Extension Host in Node.js. La webview riceve solo il sottoinsieme di dati necessario per la visualizzazione corrente e non ha accesso diretto al filesystem.

Questo è il pattern obbligato da VS Code per sicurezza, ma è anche architetturalmente corretto: il modello dati del grafo completo può essere tenuto in memoria nell'Extension Host e mandare alla webview solo i nodi visibili.

### esbuild come bundler

La webview non può importare da `node_modules` direttamente. Cytoscape e i suoi plugin devono essere bundlati in un file JS standalone servito come risorsa locale dell'estensione.

esbuild scelto su webpack: zero configurazione, ordini di grandezza più veloce, output sufficientemente ottimizzato per questo use case. webpack sarebbe giustificato solo se la webview crescesse in complessità al punto da richiedere code splitting — scenario improbabile dato l'obiettivo di mantenerla thin.

### Parser import: regex in v1

In v1 il parsing degli import TS/JS è fatto con regex. Copre i casi comuni:
- `import x from 'y'`
- `import { a, b } from 'y'`
- `import * as x from 'y'`
- `require('y')`

I casi non coperti (import dinamici `import()`, path calcolati a runtime) sono ignorati senza errore.

Tree-sitter è il candidato per v2: stessa API per 50+ linguaggi, parsing corretto al 100%, permette di estrarre anche simboli interni (funzioni, classi) necessari per il Livello 2 della visualizzazione.

---

## Flusso dati

```
Workspace files
      │
      ▼
Extension Host (Node.js)
  - scansione ricorsiva file TS/JS
  - parsing import → grafo dati in memoria
  - risponde a eventi webview (click, zoom, expand)
      │
      │  postMessage (JSON)
      ▼
Webview (HTML + Cytoscape)
  - riceve sottoinsieme nodi/edge
  - renderizza con layout dagre
  - manda eventi utente all'Extension Host
```
