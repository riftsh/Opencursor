import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Session } from './inlineChatSession.js';


export const IInlineChatSavingService = createDecorator<IInlineChatSavingService>('IInlineChatSavingService	');

export interface IInlineChatSavingService {
	_serviceBrand: undefined;

	markChanged(session: Session): void;

}
