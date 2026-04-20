declare module 'vscode' {

	// github.com/riftsh/opencursor/issues/171166

	export enum CommentState {
		Published = 0,
		Draft = 1
	}

	export interface Comment {
		state?: CommentState;
	}
}
