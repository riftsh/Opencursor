import { parentPort } from 'worker_threads';
import { serializeNotebookToString } from './serializers';
import type { NotebookData } from 'vscode';


if (parentPort) {
	parentPort.on('message', ({ id, data }: { id: string; data: NotebookData }) => {
		if (parentPort) {
			const json = serializeNotebookToString(data);
			const bytes = new TextEncoder().encode(json);
			parentPort.postMessage({ id, data: bytes });
		}
	});
}
