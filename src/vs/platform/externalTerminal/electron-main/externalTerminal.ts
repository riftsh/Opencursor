import { IExternalTerminalService } from '../common/externalTerminal.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';

export const IExternalTerminalMainService = createDecorator<IExternalTerminalMainService>('externalTerminal');

export interface IExternalTerminalMainService extends IExternalTerminalService {
	readonly _serviceBrand: undefined;
}
