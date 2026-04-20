declare module 'vscode' {

	// github.com/riftsh/opencursor/issues/61313 @alexr00

	export interface TreeView<T> extends Disposable {
		reveal(element: T | undefined, options?: { select?: boolean; focus?: boolean; expand?: boolean | number }): Thenable<void>;
	}
}
