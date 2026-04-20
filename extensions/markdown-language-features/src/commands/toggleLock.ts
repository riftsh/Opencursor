import { Command } from '../commandManager';
import { MarkdownPreviewManager } from '../preview/previewManager';

export class ToggleLockCommand implements Command {
	public readonly id = 'markdown.preview.toggleLock';

	public constructor(
		private readonly _previewManager: MarkdownPreviewManager
	) { }

	public execute() {
		this._previewManager.toggleLock();
	}
}
