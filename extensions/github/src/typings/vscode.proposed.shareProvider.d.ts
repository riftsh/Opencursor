// github.com/riftsh/opencursor/issues/176316

declare module 'vscode' {
	export interface TreeItem {
		shareableItem?: ShareableItem;
	}

	export interface ShareableItem {
		resourceUri: Uri;
		selection?: Range;
	}

	export interface ShareProvider {
		readonly id: string;
		readonly label: string;
		readonly priority: number;

		provideShare(item: ShareableItem, token: CancellationToken): ProviderResult<Uri>;
	}

	export namespace window {
		export function registerShareProvider(selector: DocumentSelector, provider: ShareProvider): Disposable;
	}
}
