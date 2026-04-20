//@ts-check

const path = require('path');

const srcDir = path.join(__dirname, 'notebook-src');
const outDir = path.join(__dirname, 'notebook-out');

require('../esbuild-webview-common').run({
	entryPoints: [
		path.join(srcDir, 'cellAttachmentRenderer.ts'),
	],
	srcDir,
	outdir: outDir,
}, process.argv);
