import { IMainContext, MainContext } from './extHost.protocol.js';
import type * as vscode from 'vscode';

export class ExtHostClipboard {

	readonly value: vscode.Clipboard;

	constructor(mainContext: IMainContext) {
		const proxy = mainContext.getProxy(MainContext.MainThreadClipboard);
		this.value = Object.freeze({
			readText() {
				return proxy.$readText();
			},
			writeText(value: string) {
				return proxy.$writeText(value);
			}
		});
	}
}
