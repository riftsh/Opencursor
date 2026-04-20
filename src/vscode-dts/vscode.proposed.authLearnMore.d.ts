declare module 'vscode' {

	// github.com/riftsh/opencursor/issues/206587

	export interface AuthenticationForceNewSessionOptions {
		/**
		 * An optional Uri to open in the browser to learn more about this authentication request.
		 */
		learnMore?: Uri;
	}
}
