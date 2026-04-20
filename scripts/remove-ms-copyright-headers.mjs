#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

const IGNORED_DIRS = new Set([
	'.git',
	'.hg',
	'.svn',
	'node_modules',
	'out',
	'dist',
	'build-cache'
]);

const ALLOWED_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
	'.cts',
	'.mts',
	'.css',
	'.scss',
	'.less',
	'.html',
	'.htm',
	'.jsonc',
	'.java',
	'.c',
	'.cc',
	'.cpp',
	'.h',
	'.hpp',
	'.m',
	'.mm',
	'.cs',
	'.go',
	'.rs',
	'.swift',
	'.kt',
	'.kts',
	'.php'
]);

const MICROSOFT_HEADER_PATTERNS = [
	/^\s*\/\*[-*=\s]*\n(?:\s*\*.*\n){0,6}\s*\*\s*Copyright\s*\(c\)\s*Microsoft Corporation\..*\n(?:\s*\*.*\n){0,8}\s*\*[-*=\s]*\*\/\s*\n?/i,
	/^\s*(?:\/\/[^\n]*\n){0,2}\s*\/\/\s*Copyright\s*\(c\)\s*Microsoft Corporation\..*\n(?:\s*\/\/[^\n]*\n){0,8}/i
];

async function walk(dir, files = []) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const absolute = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!IGNORED_DIRS.has(entry.name)) {
				await walk(absolute, files);
			}
			continue;
		}

		if (!entry.isFile()) {
			continue;
		}

		const ext = path.extname(entry.name).toLowerCase();
		if (ALLOWED_EXTENSIONS.has(ext)) {
			files.push(absolute);
		}
	}
	return files;
}

function stripHeader(content) {
	let updated = content;
	for (const pattern of MICROSOFT_HEADER_PATTERNS) {
		updated = updated.replace(pattern, '');
	}
	return updated;
}

async function main() {
	const candidates = await walk(ROOT);
	let changedCount = 0;

	for (const filePath of candidates) {
		const original = await fs.readFile(filePath, 'utf8');
		const updated = stripHeader(original);

		if (updated !== original) {
			changedCount += 1;
			const rel = path.relative(ROOT, filePath);
			console.log(`${DRY_RUN ? '[dry-run] ' : ''}updated ${rel}`);
			if (!DRY_RUN) {
				await fs.writeFile(filePath, updated, 'utf8');
			}
		}
	}

	console.log(
		`${DRY_RUN ? '[dry-run] ' : ''}done. ${changedCount} file(s) ${DRY_RUN ? 'would be' : 'were'} updated.`
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
