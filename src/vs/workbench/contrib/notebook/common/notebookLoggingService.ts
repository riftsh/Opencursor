import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const INotebookLoggingService = createDecorator<INotebookLoggingService>('INotebookLoggingService');

export interface INotebookLoggingService {
	readonly _serviceBrand: undefined;
	info(category: string, output: string): void;
	warn(category: string, output: string): void;
	error(category: string, output: string): void;
	debug(category: string, output: string): void;
}
