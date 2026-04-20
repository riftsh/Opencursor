import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICommandService } from '../../common/commands.js';

export const NullCommandService: ICommandService = {
	_serviceBrand: undefined,
	onWillExecuteCommand: () => Disposable.None,
	onDidExecuteCommand: () => Disposable.None,
	executeCommand() {
		return Promise.resolve(undefined);
	}
};
