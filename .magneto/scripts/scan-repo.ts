/**
 * scan-repo.ts — Scans the repository structure and builds a file index.
 *
 * Usage: npx tsx .magneto/scripts/scan-repo.ts
 *
 * Outputs: .magneto/cache/repo-index.json
 */

import * as fs from 'fs';
import * as path from 'path';

const IGNORE_DIRS = ['node_modules', '.git', 'dist', '.magneto/cache', '.magneto/output'];
const PROJECT_ROOT = path.resolve(__dirname, '../..');

interface FileEntry {
  path: string;
  extension: string;
  sizeBytes: number;
}

function scanDirectory(dir: string, entries: FileEntry[] = []): FileEntry[] {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(PROJECT_ROOT, fullPath);

    if (IGNORE_DIRS.some((ig) => relativePath.startsWith(ig))) continue;

    if (item.isDirectory()) {
      scanDirectory(fullPath, entries);
    } else {
      entries.push({
        path: relativePath,
        extension: path.extname(item.name),
        sizeBytes: fs.statSync(fullPath).size,
      });
    }
  }

  return entries;
}

const entries = scanDirectory(PROJECT_ROOT);
const output = {
  scannedAt: new Date().toISOString(),
  totalFiles: entries.length,
  files: entries,
};

const outPath = path.join(PROJECT_ROOT, '.magneto', 'cache', 'repo-index.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Scanned ${entries.length} files → .magneto/cache/repo-index.json`);
