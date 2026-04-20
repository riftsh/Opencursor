declare module 'vscode' {
	/**
	 * The tab represents an interactive window.
	 */
	export class TabInputChat {
		constructor();
	}

	export interface Tab {
		readonly input: TabInputText | TabInputTextDiff | TabInputCustom | TabInputWebview | TabInputNotebook | TabInputNotebookDiff | TabInputTerminal | TabInputChat | unknown;
	}
}
