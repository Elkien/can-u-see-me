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

function loadGraph(data: { nodes: { id: string; label: string }[]; edges: { source: string; target: string }[] }) {
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

// Messaggi dall'Extension Host
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg.type === 'loadGraph') {
    loadGraph(msg.data);
  }
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('cy');
  if (!container) return;
  initGraph(container);
  vscode.postMessage({ type: 'ready' });
});
