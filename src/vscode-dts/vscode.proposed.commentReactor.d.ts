declare module 'vscode' {

	// @alexr00 github.com/riftsh/opencursor/issues/201131

	export interface CommentReaction {
		readonly reactors?: readonly CommentAuthorInformation[];
	}
}
