declare module 'vscode' {

	// github.com/riftsh/opencursor/issues/73904

	export interface QuickPick<T extends QuickPickItem> extends QuickInput {
		/**
		 * An optional flag to sort the final results by index of first query match in label. Defaults to true.
		 */
		// @API is a bug that we need this API at all. why do we change the sort order
		// when extensions give us a (sorted) array of items?
		// @API sortByLabel isn't a great name
		sortByLabel: boolean;
	}
}
