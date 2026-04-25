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
	'.next',
	'.turbo',
	'coverage'
]);

const TEXT_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
	'.mts',
	'.cts',
	'.json',
	'.jsonc',
	'.md',
	'.txt',
	'.yml',
	'.yaml',
	'.xml',
	'.html',
	'.css',
	'.scss',
	'.less',
	'.sh',
	'.ps1',
	'.bat',
	'.ini',
	'.toml',
	'.properties',
	'.rs',
	'.swift',
	'.go',
	'.py',
	'.rb',
	'.java',
	'.kt',
	'.env',
	'.cfg'
]);

const IGNORED_FILES = new Set([
	'rebrand-opencursor.mjs',
	'generate-feature-masterlist-9000.mjs',
	'FEATURE_MASTERLIST_9000.md',
	'FEATURE_MASTERLIST_9000.json'
]);

const FILE_ALLOWLIST = new Set([
	'LICENSE',
	'LICENSE.txt',
	'README',
	'README.md',
	'Dockerfile'
]);

const REPLACERS = [
	// ── Identifier-safe patterns (compound identifiers like OpencursorView → OpenCursorView) ──

	// PascalCase compound: OpencursorView → OpenCursorView, OpencursorChatExtensionId → OpenCursorChatExtensionId
	{ pattern: /Opencursor(?=[A-Z])/g, replace: 'OpenCursor' },
	// PascalCase standalone: Opencursor at end of token or before non-alpha
	{ pattern: /\bOpencursor\b/g, replace: 'OpenCursor' },

	// camelCase compound: pearOverlay → opencursorOverlay
	{ pattern: /\bpearOverlay/g, replace: 'opencursorOverlay' },
	{ pattern: /\bPearOverlay/g, replace: 'OpenCursorOverlay' },

	// SCREAMING_CASE: PEAROVERLAY → OPENCURSOR_OVERLAY, Opencursor → OPENCURSOR
	{ pattern: /PEAROVERLAY/g, replace: 'OPENCURSOR_OVERLAY' },
	{ pattern: /Opencursor/g, replace: 'OPENCURSOR' },

	// lowercase compound identifiers: OpencursorChat → opencursorChat, OpencursorViews → opencursorViews
	{ pattern: /Opencursor(?=[A-Z])/g, replace: 'opencursor' },
	// lowercase standalone/kebab: Opencursor → opencursor
	{ pattern: /\bOpencursor\b/g, replace: 'opencursor' },
	{ pattern: /\bpear-ai\b/g, replace: 'opencursor' },

	// Display name variants
	{ pattern: /\bPear AI\b/g, replace: 'OpenCursor' },

	// CSS class names: pearoverlay-part-container → opencursor-overlay-part-container
	{ pattern: /pearoverlay/g, replace: 'opencursor-overlay' },

	// FIRST_LAUNCH keys
	{ pattern: /Opencursor_FIRST_LAUNCH_KEY/g, replace: 'OPENCURSOR_FIRST_LAUNCH_KEY' },

	// ── Brand URLs ──
	{ pattern: /https:\/\/riftsh\.ai\/?/g, replace: 'github.com/riftsh/opencursor' },
	{ pattern: /https:\/\/github\.com\/orgs\/riftsh\/repositories/g, replace: 'github.com/riftsh/opencursor' },
	{ pattern: /https:\/\/github\.com\/riftsh\/opencursor-submodule/g, replace: 'github.com/riftsh/opencursor' },

	// ── Repository pointers ──
	{ pattern: /https:\/\/github\.com\/microsoft\/vscode\.git/g, replace: 'github.com/riftsh/opencursor.git' },
	{ pattern: /https:\/\/github\.com\/microsoft\/vscode\/issues/g, replace: 'github.com/riftsh/opencursor/issues' }
];

function shouldProcess(fileName) {
	if (IGNORED_FILES.has(fileName)) {
		return false;
	}
	if (FILE_ALLOWLIST.has(fileName)) {
		return true;
	}
	return TEXT_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function looksBinary(content) {
	const sample = content.subarray(0, Math.min(4096, content.length));
	for (const byte of sample) {
		if (byte === 0) {
			return true;
		}
	}
	return false;
}

async function walk(dir, files = []) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!IGNORED_DIRS.has(entry.name)) {
				await walk(fullPath, files);
			}
			continue;
		}
		if (entry.isFile() && shouldProcess(entry.name)) {
			files.push(fullPath);
		}
	}
	return files;
}

function applyReplacements(input) {
	let output = input;
	for (const { pattern, replace } of REPLACERS) {
		output = output.replace(pattern, replace);
	}
	return output;
}

async function processFile(filePath) {
	const raw = await fs.readFile(filePath);
	if (looksBinary(raw)) {
		return false;
	}

	const original = raw.toString('utf8');
	const updated = applyReplacements(original);
	if (updated === original) {
		return false;
	}

	if (!DRY_RUN) {
		await fs.writeFile(filePath, updated, 'utf8');
	}

	const rel = path.relative(ROOT, filePath);
	console.log(`${DRY_RUN ? '[dry-run] ' : ''}updated ${rel}`);
	return true;
}

async function main() {
	const files = await walk(ROOT);
	let changed = 0;

	for (const filePath of files) {
		changed += (await processFile(filePath)) ? 1 : 0;
	}

	console.log(`${DRY_RUN ? '[dry-run] ' : ''}done. ${changed} file(s) ${DRY_RUN ? 'would be' : 'were'} updated.`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
