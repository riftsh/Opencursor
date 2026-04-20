import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const INotebookKeymapService = createDecorator<INotebookKeymapService>('notebookKeymapService');

export interface INotebookKeymapService {
	readonly _serviceBrand: undefined;
}
