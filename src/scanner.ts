import * as fs from 'fs';
import * as path from 'path';
import { extractImports } from './parser';
import { GraphData, GraphNode, GraphEdge } from './types';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const EXCLUDED_DIRS = new Set(['node_modules', 'out', 'dist', '.git', 'media', 'coverage']);

function findFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      results.push(...findFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && EXTENSIONS.includes(path.extname(entry.name))) {
      results.push(path.join(dir, entry.name));
    }
  }

  return results;
}

function resolveImport(rawPath: string, sourceDir: string, fileSet: Set<string>): string | undefined {
  const base = path.resolve(sourceDir, rawPath);

  // Try direct extension match first
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fileSet.has(candidate)) return candidate;
  }

  // Try as-is (already has extension)
  if (fileSet.has(base)) return base;

  // Try index files
  for (const ext of EXTENSIONS) {
    const candidate = path.join(base, `index${ext}`);
    if (fileSet.has(candidate)) return candidate;
  }

  return undefined;
}

export function scanWorkspace(rootPath: string): GraphData {
  const files = findFiles(rootPath);
  const fileSet = new Set(files);

  const nodes: GraphNode[] = files.map(f => ({
    id: f,
    label: path.relative(rootPath, f).replace(/\\/g, '/'),
  }));

  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const sourceDir = path.dirname(file);
    const rawImports = extractImports(content);

    for (const rawPath of rawImports) {
      const resolved = resolveImport(rawPath, sourceDir, fileSet);
      if (!resolved) continue;

      const edgeKey = `${file}→${resolved}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);

      edges.push({ source: file, target: resolved });
    }
  }

  return { nodes, edges };
}
