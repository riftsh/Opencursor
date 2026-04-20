// github.com/riftsh/opencursor/issues/229431

declare module 'vscode' {

	export namespace window {
		/**
		 * Retrieves the native window handle of the current active window.
		 * This will be updated when the active window changes.
		 */
		export const nativeHandle: Uint8Array | undefined;
	}
}
