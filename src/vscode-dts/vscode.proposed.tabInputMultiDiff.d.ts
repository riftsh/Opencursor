// github.com/riftsh/opencursor/issues/206411

declare module 'vscode' {

	export class TabInputTextMultiDiff {

		readonly textDiffs: TabInputTextDiff[];

		constructor(textDiffs: TabInputTextDiff[]);
	}

	export interface Tab {

		readonly input: TabInputText | TabInputTextDiff | TabInputTextMultiDiff | TabInputCustom | TabInputWebview | TabInputNotebook | TabInputNotebookDiff | TabInputTerminal | unknown;

	}
}
