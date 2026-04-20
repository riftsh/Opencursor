import { MarshalledId } from '../../../../base/common/marshallingIds.js';

export interface IChatViewTitleActionContext {
	$mid: MarshalledId.ChatViewContext;
	sessionId: string;
}

export function isChatViewTitleActionContext(obj: unknown): obj is IChatViewTitleActionContext {
	return !!obj &&
		typeof (obj as IChatViewTitleActionContext).sessionId === 'string'
		&& (obj as IChatViewTitleActionContext).$mid === MarshalledId.ChatViewContext;
}
