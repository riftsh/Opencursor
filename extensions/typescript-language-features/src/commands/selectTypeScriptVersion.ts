import TypeScriptServiceClientHost from '../typeScriptServiceClientHost';
import { Lazy } from '../utils/lazy';
import { Command } from './commandManager';

export class SelectTypeScriptVersionCommand implements Command {
	public static readonly id = 'typescript.selectTypeScriptVersion';
	public readonly id = SelectTypeScriptVersionCommand.id;

	public constructor(
		private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
	) { }

	public execute() {
		this.lazyClientHost.value.serviceClient.showVersionPicker();
	}
}
