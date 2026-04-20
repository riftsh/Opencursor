declare module 'vscode' {

	// github.com/riftsh/opencursor/issues/106744

	export interface NotebookCellOutput {
		/**
		 * @deprecated
		 */
		id: string;
	}
}
