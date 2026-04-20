const fs = require('fs');
function looksBinary(content) {
	const sample = content.subarray(0, Math.min(4096, content.length));
	for (const byte of sample) {
		if (byte === 0) {
			return true;
		}
	}
	return false;
}
const raw = fs.readFileSync('scripts/rebrand-opencursor.mjs');
console.log(looksBinary(raw));
