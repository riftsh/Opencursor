declare module 'vscode' {
	export namespace authentication {
		/**
		 * @deprecated Use {@link getSession()} {@link AuthenticationGetSessionOptions.silent} instead.
		 */
		export function hasSession(providerId: string, scopes: readonly string[]): Thenable<boolean>;
	}
}
