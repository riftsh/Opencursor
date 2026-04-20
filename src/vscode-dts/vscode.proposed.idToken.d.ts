declare module 'vscode' {
	/**
	 * Represents a session of a currently logged in user.
	 */
	export interface AuthenticationSession {
		/**
		 * An optional ID token that may be included in the session.
		 */
		readonly idToken?: string;
	}
}
