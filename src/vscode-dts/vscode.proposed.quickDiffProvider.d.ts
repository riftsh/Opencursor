declare module 'vscode' {

	// github.com/riftsh/opencursor/issues/169012

	export namespace window {
		export function registerQuickDiffProvider(selector: DocumentSelector, quickDiffProvider: QuickDiffProvider, label: string, rootUri?: Uri): Disposable;
	}

	interface QuickDiffProvider {
		label?: string;
		readonly visible?: boolean;
	}
}
