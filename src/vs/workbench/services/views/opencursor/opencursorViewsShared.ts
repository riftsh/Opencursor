export type OpenCursorView = 'chat' | 'agent' | 'search' | 'memory';

export const OpenCursorChatExtensionId = 'workbench.view.extension.opencursorChat';
export const OpenCursorSearchExtensionId = 'workbench.view.extension.opencursorSearch';
export const OpenCursorMemoryExtensionId = 'workbench.view.extension.opencursorMemory';
export const OpenCursorRooExtensionId = 'workbench.view.extension.opencursor-roo-cline';

export const OPENCURSOR_VIEWS = {
  chat: OpenCursorChatExtensionId,
  agent: OpenCursorRooExtensionId,
  search: OpenCursorSearchExtensionId,
  memory: OpenCursorMemoryExtensionId
} as const;

export const auxiliaryBarAllowedViewContainerIDs = ['workbench.view.extension.opencursor', 'workbench.view.extension.opencursor-roo-cline', 'workbench.views.service.auxiliarybar'];
// auxiliary bar here is needed because additional views created by our integrations look like: workbench.views.service.auxiliarybar.c01af9cf-6360-4e6a-a725-4dfd9832755c
