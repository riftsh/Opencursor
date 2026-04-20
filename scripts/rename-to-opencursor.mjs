import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const IGNORED_DIRS = new Set(['.git', '.hg', '.svn', 'node_modules', 'out', 'dist', '.next', '.turbo', 'coverage']);
const IGNORED_FILES = new Set(['rename-to-opencursor.mjs']);

const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
  '.json', '.jsonc', '.md', '.txt', '.yml', '.yaml', '.xml',
  '.html', '.css', '.scss', '.less', '.sh', '.ps1', '.bat',
  '.ini', '.toml', '.properties', '.rs', '.swift', '.go', '.py',
  '.rb', '.java', '.kt', '.env', '.cfg'
]);

const FILE_ALLOWLIST = new Set(['LICENSE', 'LICENSE.txt', 'README', 'README.md', 'Dockerfile']);

function shouldProcess(fileName) {
  if (IGNORED_FILES.has(fileName)) return false;
  if (FILE_ALLOWLIST.has(fileName)) return true;
  return ALLOWED_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

async function walk(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) await walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && shouldProcess(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const REPLACERS = [
  { pattern: /open-cursor/g, replace: 'opencursor' },
  { pattern: /Open Cursor/g, replace: 'OpenCursor' },
  { pattern: /Open-Cursor/g, replace: 'OpenCursor' }
];

async function processFile(filePath) {
  const raw = await fs.readFile(filePath);
  const original = raw.toString('utf8');
  let updated = original;
  for (const { pattern, replace } of REPLACERS) {
    updated = updated.replace(pattern, replace);
  }
  if (updated !== original) {
    await fs.writeFile(filePath, updated, 'utf8');
    return true;
  }
  return false;
}

async function main() {
  const files = await walk(ROOT);
  let changed = 0;
  for (const file of files) {
    if (await processFile(file)) changed++;
  }
  console.log(`Renamed in ${changed} files.`);
}

main().catch(console.error);
