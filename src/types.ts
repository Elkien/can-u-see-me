export interface GraphNode {
  id: string;     // absolute file path (unique)
  label: string;  // relative path from root (e.g. "src/auth/index.ts")
}

export interface GraphEdge {
  source: string; // source file id
  target: string; // target file id
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
