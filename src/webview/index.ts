import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

let cy: cytoscape.Core | null = null;

type GraphData = {
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string }[];
};

let fullData: GraphData | null = null;
let savedPositions: Record<string, { x: number; y: number }> | null = null;

function initGraph(container: HTMLElement) {
  cy = cytoscape({
    container,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#161b22',
          'border-color': '#30363d',
          'border-width': 1,
          'color': '#e6edf3',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-family': 'Courier New, monospace',
          'font-size': '11px',
          'width': 'label',
          'height': 'label',
          'padding': '10px',
          'shape': 'roundrectangle',
        },
      },
      {
        selector: 'node:selected',
        style: {
          'border-color': '#58a6ff',
          'border-width': 2,
        },
      },
      {
        selector: 'node.highlighted',
        style: {
          'border-color': '#3fb950',
          'border-width': 2,
          'background-color': '#0d2818',
        },
      },
      {
        selector: 'node.dimmed',
        style: {
          'opacity': 0.2,
        },
      },
      {
        selector: 'edge',
        style: {
          'width': 1,
          'line-color': '#30363d',
          'target-arrow-color': '#30363d',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
        },
      },
      {
        selector: 'edge.highlighted',
        style: {
          'line-color': '#58a6ff',
          'target-arrow-color': '#58a6ff',
        },
      },
      {
        selector: 'edge.dimmed',
        style: {
          'opacity': 0.1,
        },
      },
    ],
    layout: { name: 'preset' },
    wheelSensitivity: 1,
  });

  cy.on('tap', 'node', (evt) => {
    const node = evt.target;
    highlightNeighborhood(node);
    vscode.postMessage({ type: 'nodeSelected', id: node.id() });
  });

  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      clearHighlight();
      vscode.postMessage({ type: 'selectionCleared' });
    }
  });
}

function highlightNeighborhood(node: cytoscape.NodeSingular) {
  if (!cy) return;
  const neighborhood = node.closedNeighborhood();
  cy.elements().addClass('dimmed').removeClass('highlighted');
  neighborhood.removeClass('dimmed').addClass('highlighted');
}

function clearHighlight() {
  if (!cy) return;
  cy.elements().removeClass('dimmed').removeClass('highlighted');
}

function loadGraph(data: GraphData) {
  if (!cy) return;

  cy.elements().remove();

  cy.add([
    ...data.nodes.map(n => ({ group: 'nodes' as const, data: { id: n.id, label: n.label } })),
    ...data.edges.map(e => ({ group: 'edges' as const, data: { source: e.source, target: e.target } })),
  ]);

  cy.layout({
    name: 'dagre',
    rankDir: 'LR',
    nodeSep: 40,
    rankSep: 80,
    padding: 32,
  } as cytoscape.LayoutOptions).run();

  cy.fit(undefined, 32);
}

function setCount(matched: number, total: number) {
  const el = document.getElementById('search-count');
  if (!el) return;
  el.textContent = matched < total ? `${matched} / ${total} files` : `${total} files`;
}

function filterGraph(query: string) {
  if (!cy || !fullData) return;

  if (!query.trim()) {
    // Restore original positions and show all
    cy.batch(() => {
      if (savedPositions) {
        cy!.nodes().forEach(n => {
          const pos = savedPositions![n.id()];
          if (pos) n.position(pos);
        });
      }
      cy!.elements().show();
    });
    savedPositions = null;
    cy.fit(undefined, 32);
    setCount(fullData.nodes.length, fullData.nodes.length);
    return;
  }

  // Save positions before first filter
  if (!savedPositions) {
    savedPositions = {};
    cy.nodes().forEach(n => { savedPositions![n.id()] = { ...n.position() }; });
  }

  const q = query.toLowerCase();
  const matchedIds = new Set(
    fullData.nodes
      .filter(n => n.label.toLowerCase().includes(q))
      .map(n => n.id)
  );

  // Include 1-hop neighbors for context
  const visibleIds = new Set(matchedIds);
  for (const e of fullData.edges) {
    if (matchedIds.has(e.source)) visibleIds.add(e.target);
    if (matchedIds.has(e.target)) visibleIds.add(e.source);
  }

  cy.batch(() => {
    cy!.elements().hide();
    cy!.nodes().filter(n => visibleIds.has(n.id())).show();
    cy!.edges().filter(e => visibleIds.has(e.source().id()) && visibleIds.has(e.target().id())).show();
  });

  // Re-layout only visible nodes (few → fast)
  cy.elements(':visible').layout({
    name: 'dagre',
    rankDir: 'LR',
    nodeSep: 40,
    rankSep: 80,
    padding: 32,
  } as cytoscape.LayoutOptions).run();

  cy.fit(undefined, 32);
  setCount(visibleIds.size, fullData.nodes.length);
}

// Messaggi dall'Extension Host
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg.type === 'loadGraph') {
    fullData = msg.data;
    loadGraph(msg.data);
    setCount(msg.data.nodes.length, msg.data.nodes.length);
  }
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('cy');
  if (!container) return;
  initGraph(container);

  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) {
    let debounceTimer: ReturnType<typeof setTimeout>;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => filterGraph(searchInput.value), 200);
    });
  }

  vscode.postMessage({ type: 'ready' });
});
