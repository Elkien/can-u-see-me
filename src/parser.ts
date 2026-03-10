const IMPORT_PATTERNS = [
  // import ... from './foo' or import ... from "../foo"
  /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  // const x = require('./foo')
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

export function extractImports(content: string): string[] {
  const results: string[] = [];

  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const rawPath = match[1];
      if (rawPath.startsWith('.')) {
        results.push(rawPath);
      }
    }
  }

  return results;
}
