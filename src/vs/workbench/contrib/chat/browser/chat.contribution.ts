import { timeout } from '../../../../base/common/async.js';
import { MarkdownString, isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh, isNative } from '../../../../base/common/platform.js';
import { EditorContributionInstantiation, registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { registerEditorFeature } from '../../../../editor/common/editorFeatures.js';
import * as nls from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, ConfigurationScope, IConfigurationRegistry } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions, IEditorFactoryRegistry } from '../../../common/editor.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { ChatAgentLocation, ChatAgentNameService, ChatAgentService, IChatAgentNameService, IChatAgentService } from '../common/chatAgents.js';
import { CodeMapperService, ICodeMapperService } from '../common/chatCodeMapperService.js';
import '../common/chatColors.js';
import { IChatEditingService } from '../common/chatEditingService.js';
import { chatVariableLeader } from '../common/chatParserTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatService } from '../common/chatServiceImpl.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../common/chatSlashCommands.js';
import { IChatVariablesService } from '../common/chatVariables.js';
import { ChatWidgetHistoryService, IChatWidgetHistoryService } from '../common/chatWidgetHistoryService.js';
import { ILanguageModelsService, LanguageModelsService } from '../common/languageModels.js';
import { ILanguageModelStatsService, LanguageModelStatsService } from '../common/languageModelStats.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { LanguageModelToolsExtensionPointHandler } from '../common/tools/languageModelToolsContribution.js';
import { IVoiceChatService, VoiceChatService } from '../common/voiceChatService.js';
import { PanelChatAccessibilityHelp, QuickChatAccessibilityHelp } from './actions/chatAccessibilityHelp.js';
import { ChatCommandCenterRendering, registerChatActions } from './actions/chatActions.js';
import { ACTION_ID_NEW_CHAT, registerNewChatActions } from './actions/chatClearActions.js';
import { registerChatCodeBlockActions, registerChatCodeCompareBlockActions } from './actions/chatCodeblockActions.js';
import { registerChatContextActions } from './actions/chatContextActions.js';
import { registerChatCopyActions } from './actions/chatCopyActions.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
import { ChatSubmitAction, registerChatExecuteActions } from './actions/chatExecuteActions.js';
import { registerChatFileTreeActions } from './actions/chatFileTreeActions.js';
import { registerChatExportActions } from './actions/chatImportExport.js';
import { registerMoveActions } from './actions/chatMoveActions.js';
import { registerQuickChatActions } from './actions/chatQuickInputActions.js';
import { registerChatTitleActions } from './actions/chatTitleActions.js';
import { IChatAccessibilityService, IChatCodeBlockContextProviderService, IChatWidgetService, IQuickChatService } from './chat.js';
import { ChatAccessibilityService } from './chatAccessibilityService.js';
import './chatAttachmentModel.js';
import { ChatMarkdownAnchorService, IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
import { ChatEditingService } from './chatEditing/chatEditingService.js';
import { ChatEditor, IChatEditorOptions } from './chatEditor.js';
import { registerChatEditorActions } from './chatEditorActions.js';
import { ChatEditorController } from './chatEditorController.js';
import { ChatEditorInput, ChatEditorInputSerializer } from './chatEditorInput.js';
import { ChatInputBoxContentProvider } from './chatEdinputInputContentProvider.js';
import { ChatEditorAutoSaveDisabler, ChatEditorSaving } from './chatEditorSaving.js';
import { agentSlashCommandToMarkdown, agentToMarkdown } from './chatMarkdownDecorationsRenderer.js';
import { ChatCompatibilityNotifier, ChatExtensionPointHandler } from './chatParticipant.contribution.js';
import { ChatPasteProvidersFeature } from './chatPasteProviders.js';
import { QuickChatService } from './chatQuick.js';
import { ChatResponseAccessibleView } from './chatResponseAccessibleView.js';
import { ChatVariablesService } from './chatVariables.js';
import { ChatWidgetService } from './chatWidget.js';
import { ChatCodeBlockContextProviderService } from './codeBlockContextProviderService.js';
import './contrib/chatInputCompletions.js';
import './contrib/chatInputEditorContrib.js';
import './contrib/chatInputEditorHover.js';
import { ChatImplicitContextContribution } from './contrib/chatImplicitContext.js';
import { LanguageModelToolsService } from './languageModelToolsService.js';
import { ChatViewsWelcomeHandler } from './viewsWelcome/chatViewsWelcomeHandler.js';
import { ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService } from '../common/ignoredFiles.js';
import { ChatGettingStartedContribution } from './actions/chatGettingStarted.js';
import { Extensions, IConfigurationMigrationRegistry } from '../../../common/configuration.js';
import { ChatEditorOverlayController } from './chatEditorOverlay.js';
import { ChatRelatedFilesContribution } from './contrib/chatInputRelatedFilesContrib.js';
import { ChatQuotasService, ChatQuotasStatusBarEntry, IChatQuotasService } from './chatQuotasService.js';

// Register configuration
const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
	id: 'chatSidebar',
	title: nls.localize('interactiveSessionConfigurationTitle', "Chat"),
	type: 'object',
	properties: {
		'chat.editor.fontSize': {
			type: 'number',
			description: nls.localize('interactiveSession.editor.fontSize', "Controls the font size in pixels in chat codeblocks."),
			default: isMacintosh ? 12 : 14,
		},
		'chat.editor.fontFamily': {
			type: 'string',
			description: nls.localize('interactiveSession.editor.fontFamily', "Controls the font family in chat codeblocks."),
			default: 'default'
		},
		'chat.editor.fontWeight': {
			type: 'string',
			description: nls.localize('interactiveSession.editor.fontWeight', "Controls the font weight in chat codeblocks."),
			default: 'default'
		},
		'chat.editor.wordWrap': {
			type: 'string',
			description: nls.localize('interactiveSession.editor.wordWrap', "Controls whether lines should wrap in chat codeblocks."),
			default: 'off',
			enum: ['on', 'off']
		},
		'chat.editor.lineHeight': {
			type: 'number',
			description: nls.localize('interactiveSession.editor.lineHeight', "Controls the line height in pixels in chat codeblocks. Use 0 to compute the line height from the font size."),
			default: 0
		},
		'chat.commandCenter.enabled': {
			type: 'boolean',
			tags: ['preview'],
			markdownDescription: nls.localize('chat.commandCenter.enabled', "Controls whether the command center shows a menu for actions to control Copilot (requires {0}).", '`#window.commandCenter#`'),
			default: true
		},
		'chat.experimental.offerSetup': {
			type: 'boolean',
			default: isNative,
			scope: ConfigurationScope.APPLICATION,
			markdownDescription: nls.localize('chat.experimental.offerSetup', "Controls whether setup is offered for Chat if not done already."),
			tags: ['experimental', 'onExP']
		},
		'chat.editing.alwaysSaveWithGeneratedChanges': {
			type: 'boolean',
			scope: ConfigurationScope.APPLICATION,
			markdownDescription: nls.localize('chat.editing.alwaysSaveWithGeneratedChanges', "Whether files that have changes made by chat can be saved without confirmation."),
			default: false,
		},
		'chat.editing.confirmEditRequestRemoval': {
			type: 'boolean',
			scope: ConfigurationScope.APPLICATION,
			markdownDescription: nls.localize('chat.editing.confirmEditRequestRemoval', "Whether to show a confirmation before removing a request and its associated edits."),
			default: true,
		},
		'chat.editing.confirmEditRequestRetry': {
			type: 'boolean',
			scope: ConfigurationScope.APPLICATION,
			markdownDescription: nls.localize('chat.editing.confirmEditRequestRetry', "Whether to show a confirmation before retrying a request and its associated edits."),
			default: true,
		},
		'chat.experimental.detectParticipant.enabled': {
			type: 'boolean',
			deprecationMessage: nls.localize('chat.experimental.detectParticipant.enabled.deprecated', "This setting is deprecated. Please use `chat.detectParticipant.enabled` instead."),
			description: nls.localize('chat.experimental.detectParticipant.enabled', "Enables chat participant autodetection for panel chat."),
			default: null
		},
		'chat.detectParticipant.enabled': {
			type: 'boolean',
			description: nls.localize('chat.detectParticipant.enabled', "Enables chat participant autodetection for panel chat."),
			default: true
		},
		'chat.openCursor.providerRouting.enabled': {
			type: 'boolean',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.providerRouting.enabled', "Enables OpenCursor provider fallback routing for chat requests."),
			default: true
		},
		'chat.openCursor.providerRouting.maxFallbackAttempts': {
			type: 'number',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.providerRouting.maxFallbackAttempts', "Controls how many fallback attempts OpenCursor runs per request."),
			default: 2,
			minimum: 1,
			maximum: 5
		},
		'chat.openCursor.providerRouting.mode': {
			type: 'string',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.providerRouting.mode', "Controls OpenCursor AI routing mode."),
			default: 'balanced',
			enum: ['fast', 'balanced', 'max']
		},
		'chat.openCursor.aiProfile': {
			type: 'string',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.aiProfile', "Controls OpenCursor AI behavior profile."),
			default: 'balanced',
			enum: ['rapid', 'balanced', 'deep']
		},
		'chat.openCursor.memory.enabled': {
			type: 'boolean',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.memory.enabled', "Enables OpenCursor session memory snapshots for agent requests."),
			default: true
		},
		'chat.openCursor.memory.maxEntries': {
			type: 'number',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.memory.maxEntries', "Controls how many prior prompts are retained in OpenCursor session memory."),
			default: 8,
			minimum: 0,
			maximum: 100
		},
		'chat.openCursor.workflow.enabled': {
			type: 'boolean',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.workflow.enabled', "Enables OpenCursor multi-step workflow progress in chat responses."),
			default: true
		},
		'chat.openCursor.tools.forceConfirmation': {
			type: 'boolean',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.tools.forceConfirmation', "Forces confirmation prompts before any OpenCursor tool invocation."),
			default: false
		},
		'chat.openCursor.tools.blocked': {
			type: 'array',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.tools.blocked', "Blocks listed tool IDs from being invoked by OpenCursor."),
			default: [],
			items: {
				type: 'string'
			}
		},
		'chat.openCursor.templates.enabled': {
			type: 'boolean',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.templates.enabled', "Enables OpenCursor workflow prompt templates."),
			default: true
		},
		'chat.openCursor.agent.autodetectBias': {
			type: 'string',
			scope: ConfigurationScope.APPLICATION,
			tags: ['experimental'],
			description: nls.localize('chat.openCursor.agent.autodetectBias', "Controls how aggressively OpenCursor tries automatic agent detection."),
			default: 'medium',
			enum: ['low', 'medium', 'high']
		},
	}
});
Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(
		ChatEditor,
		ChatEditorInput.EditorID,
		nls.localize('chat', "Chat")
	),
	[
		new SyncDescriptor(ChatEditorInput)
	]
);
Registry.as<IConfigurationMigrationRegistry>(Extensions.ConfigurationMigration).registerConfigurationMigrations([
	{
		key: 'chat.experimental.detectParticipant.enabled',
		migrateFn: (value, _accessor) => ([
			['chat.experimental.detectParticipant.enabled', { value: undefined }],
			['chat.detectParticipant.enabled', { value: value !== false }]
		])
	}
]);

class ChatResolverContribution extends Disposable {

	static readonly ID = 'workbench.contrib.chatResolver';

	constructor(
		@IEditorResolverService editorResolverService: IEditorResolverService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		this._register(editorResolverService.registerEditor(
			`${Schemas.vscodeChatSesssion}:**/**`,
			{
				id: ChatEditorInput.EditorID,
				label: nls.localize('chat', "Chat"),
				priority: RegisteredEditorPriority.builtin
			},
			{
				singlePerResource: true,
				canSupportResource: resource => resource.scheme === Schemas.vscodeChatSesssion
			},
			{
				createEditorInput: ({ resource, options }) => {
					return { editor: instantiationService.createInstance(ChatEditorInput, resource, options as IChatEditorOptions), options };
				}
			}
		));
	}
}

AccessibleViewRegistry.register(new ChatResponseAccessibleView());
AccessibleViewRegistry.register(new PanelChatAccessibilityHelp());
AccessibleViewRegistry.register(new QuickChatAccessibilityHelp());

registerEditorFeature(ChatInputBoxContentProvider);

class ChatSlashStaticSlashCommandsContribution extends Disposable {

	static readonly ID = 'workbench.contrib.chatSlashStaticSlashCommands';

	constructor(
		@IChatSlashCommandService slashCommandService: IChatSlashCommandService,
		@ICommandService commandService: ICommandService,
		@IChatAgentService chatAgentService: IChatAgentService,
		@IChatVariablesService chatVariablesService: IChatVariablesService,
		@IConfigurationService configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();
		this._store.add(slashCommandService.registerSlashCommand({
			command: 'clear',
			detail: nls.localize('clear', "Start a new chat"),
			sortText: 'z2_clear',
			executeImmediately: true,
			locations: [ChatAgentLocation.Panel]
		}, async () => {
			commandService.executeCommand(ACTION_ID_NEW_CHAT);
		}));
		this._store.add(slashCommandService.registerSlashCommand({
			command: 'help',
			detail: '',
			sortText: 'z1_help',
			executeImmediately: true,
			locations: [ChatAgentLocation.Panel]
		}, async (prompt, progress) => {
			const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
			const agents = chatAgentService.getAgents();

			// Report prefix
			if (defaultAgent?.metadata.helpTextPrefix) {
				if (isMarkdownString(defaultAgent.metadata.helpTextPrefix)) {
					progress.report({ content: defaultAgent.metadata.helpTextPrefix, kind: 'markdownContent' });
				} else {
					progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPrefix), kind: 'markdownContent' });
				}
				progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
			}

			// Report agent list
			const agentText = (await Promise.all(agents
				.filter(a => a.id !== defaultAgent?.id)
				.filter(a => a.locations.includes(ChatAgentLocation.Panel))
				.map(async a => {
					const description = a.description ? `- ${a.description}` : '';
					const agentMarkdown = instantiationService.invokeFunction(accessor => agentToMarkdown(a, true, accessor));
					const agentLine = `- ${agentMarkdown} ${description}`;
					const commandText = a.slashCommands.map(c => {
						const description = c.description ? `- ${c.description}` : '';
						return `\t* ${agentSlashCommandToMarkdown(a, c)} ${description}`;
					}).join('\n');

					return (agentLine + '\n' + commandText).trim();
				}))).join('\n');
			progress.report({ content: new MarkdownString(agentText, { isTrusted: { enabledCommands: [ChatSubmitAction.ID] } }), kind: 'markdownContent' });

			// Report variables
			if (defaultAgent?.metadata.helpTextVariablesPrefix) {
				progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
				if (isMarkdownString(defaultAgent.metadata.helpTextVariablesPrefix)) {
					progress.report({ content: defaultAgent.metadata.helpTextVariablesPrefix, kind: 'markdownContent' });
				} else {
					progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextVariablesPrefix), kind: 'markdownContent' });
				}

				const variables = [
					...chatVariablesService.getVariables(ChatAgentLocation.Panel),
					{ name: 'file', description: nls.localize('file', "Choose a file in the workspace") }
				];
				const variableText = variables
					.map(v => `* \`${chatVariableLeader}${v.name}\` - ${v.description}`)
					.join('\n');
				progress.report({ content: new MarkdownString('\n' + variableText), kind: 'markdownContent' });
			}

			// Report help text ending
			if (defaultAgent?.metadata.helpTextPostfix) {
				progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
				if (isMarkdownString(defaultAgent.metadata.helpTextPostfix)) {
					progress.report({ content: defaultAgent.metadata.helpTextPostfix, kind: 'markdownContent' });
				} else {
					progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPostfix), kind: 'markdownContent' });
				}
			}

			// Without this, the response will be done before it renders and so it will not stream. This ensures that if the response starts
			// rendering during the next 200ms, then it will be streamed. Once it starts streaming, the whole response streams even after
			// it has received all response data has been received.
			await timeout(200);
		}));
		this._store.add(slashCommandService.registerSlashCommand({
			command: 'workflow-status',
			detail: nls.localize('workflowStatus', "Show OpenCursor workflow feature status"),
			sortText: 'z3_workflow',
			executeImmediately: true,
			locations: [ChatAgentLocation.Panel]
		}, async (_prompt, progress) => {
			const lines = [
				`- ai profile: **${configurationService.getValue('chat.openCursor.aiProfile')}**`,
				`- provider routing: **${configurationService.getValue('chat.openCursor.providerRouting.enabled') ? 'enabled' : 'disabled'}**`,
				`- fallback attempts: **${configurationService.getValue('chat.openCursor.providerRouting.maxFallbackAttempts')}**`,
				`- routing mode: **${configurationService.getValue('chat.openCursor.providerRouting.mode')}**`,
				`- memory: **${configurationService.getValue('chat.openCursor.memory.enabled') ? 'enabled' : 'disabled'}**`,
				`- agent autodetect bias: **${configurationService.getValue('chat.openCursor.agent.autodetectBias')}**`,
				`- workflow events: **${configurationService.getValue('chat.openCursor.workflow.enabled') ? 'enabled' : 'disabled'}**`,
				`- force tool confirmations: **${configurationService.getValue('chat.openCursor.tools.forceConfirmation') ? 'enabled' : 'disabled'}**`
			];
			progress.report({ kind: 'markdownContent', content: new MarkdownString(lines.join('\n')) });
		}));
		this._store.add(slashCommandService.registerSlashCommand({
			command: 'oc-mode',
			detail: nls.localize('ocMode', "Set OpenCursor routing mode (fast|balanced|max)"),
			sortText: 'z4_oc_mode',
			executeImmediately: false,
			locations: [ChatAgentLocation.Panel]
		}, async (prompt, progress) => {
			const modeArg = prompt.trim().toLowerCase();
			const mode = modeArg === 'fast' || modeArg === 'balanced' || modeArg === 'max' ? modeArg : undefined;
			if (!mode) {
				progress.report({ kind: 'markdownContent', content: new MarkdownString('Usage: `/oc-mode fast`, `/oc-mode balanced`, or `/oc-mode max`.') });
				return;
			}

			await configurationService.updateValue('chat.openCursor.providerRouting.mode', mode);
			progress.report({ kind: 'markdownContent', content: new MarkdownString(`OpenCursor routing mode set to **${mode}**.`) });
		}));
		this._store.add(slashCommandService.registerSlashCommand({
			command: 'oc-profile',
			detail: nls.localize('ocProfile', "Set OpenCursor AI profile (rapid|balanced|deep)"),
			sortText: 'z5_oc_profile',
			executeImmediately: false,
			locations: [ChatAgentLocation.Panel]
		}, async (prompt, progress) => {
			const profileArg = prompt.trim().toLowerCase();
			const profile = profileArg === 'rapid' || profileArg === 'balanced' || profileArg === 'deep' ? profileArg : undefined;
			if (!profile) {
				progress.report({ kind: 'markdownContent', content: new MarkdownString('Usage: `/oc-profile rapid`, `/oc-profile balanced`, or `/oc-profile deep`.') });
				return;
			}
			await configurationService.updateValue('chat.openCursor.aiProfile', profile);
			progress.report({ kind: 'markdownContent', content: new MarkdownString(`OpenCursor AI profile set to **${profile}**.`) });
		}));
		this._store.add(slashCommandService.registerSlashCommand({
			command: 'oc-agent-bias',
			detail: nls.localize('ocAgentBias', "Set agent autodetect bias (low|medium|high)"),
			sortText: 'z6_oc_agent_bias',
			executeImmediately: false,
			locations: [ChatAgentLocation.Panel]
		}, async (prompt, progress) => {
			const biasArg = prompt.trim().toLowerCase();
			const bias = biasArg === 'low' || biasArg === 'medium' || biasArg === 'high' ? biasArg : undefined;
			if (!bias) {
				progress.report({ kind: 'markdownContent', content: new MarkdownString('Usage: `/oc-agent-bias low`, `/oc-agent-bias medium`, or `/oc-agent-bias high`.') });
				return;
			}
			await configurationService.updateValue('chat.openCursor.agent.autodetectBias', bias);
			progress.report({ kind: 'markdownContent', content: new MarkdownString(`OpenCursor agent autodetect bias set to **${bias}**.`) });
		}));
		this._store.add(slashCommandService.registerSlashCommand({
			command: 'oc-templates',
			detail: nls.localize('ocTemplates', "Show OpenCursor workflow templates"),
			sortText: 'z7_oc_templates',
			executeImmediately: true,
			locations: [ChatAgentLocation.Panel]
		}, async (_prompt, progress) => {
			const templatesEnabled = !!configurationService.getValue('chat.openCursor.templates.enabled');
			if (!templatesEnabled) {
				progress.report({ kind: 'markdownContent', content: new MarkdownString('OpenCursor templates are disabled. Enable `chat.openCursor.templates.enabled` to use them.') });
				return;
			}

			const templateText = [
				'### OpenCursor Templates',
				'- `bugfix`: Reproduce, isolate, patch, and add regression test.',
				'- `refactor`: Preserve behavior, improve structure, and run validations.',
				'- `test-first`: Write failing test, implement fix, then verify.',
				'- `performance`: Profile hotspots, optimize critical path, and measure delta.'
			].join('\n');
			progress.report({ kind: 'markdownContent', content: new MarkdownString(templateText) });
		}));
	}
}
Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerEditorSerializer(ChatEditorInput.TypeID, ChatEditorInputSerializer);

registerWorkbenchContribution2(ChatResolverContribution.ID, ChatResolverContribution, WorkbenchPhase.BlockStartup);
registerWorkbenchContribution2(ChatSlashStaticSlashCommandsContribution.ID, ChatSlashStaticSlashCommandsContribution, WorkbenchPhase.Eventually);
registerWorkbenchContribution2(ChatExtensionPointHandler.ID, ChatExtensionPointHandler, WorkbenchPhase.BlockStartup);
registerWorkbenchContribution2(LanguageModelToolsExtensionPointHandler.ID, LanguageModelToolsExtensionPointHandler, WorkbenchPhase.BlockRestore);
registerWorkbenchContribution2(ChatCompatibilityNotifier.ID, ChatCompatibilityNotifier, WorkbenchPhase.Eventually);
registerWorkbenchContribution2(ChatCommandCenterRendering.ID, ChatCommandCenterRendering, WorkbenchPhase.BlockRestore);
registerWorkbenchContribution2(ChatImplicitContextContribution.ID, ChatImplicitContextContribution, WorkbenchPhase.Eventually);
registerWorkbenchContribution2(ChatRelatedFilesContribution.ID, ChatRelatedFilesContribution, WorkbenchPhase.Eventually);
registerWorkbenchContribution2(ChatEditorSaving.ID, ChatEditorSaving, WorkbenchPhase.AfterRestored);
registerWorkbenchContribution2(ChatEditorAutoSaveDisabler.ID, ChatEditorAutoSaveDisabler, WorkbenchPhase.BlockRestore);
registerWorkbenchContribution2(ChatViewsWelcomeHandler.ID, ChatViewsWelcomeHandler, WorkbenchPhase.BlockStartup);
registerWorkbenchContribution2(ChatGettingStartedContribution.ID, ChatGettingStartedContribution, WorkbenchPhase.Eventually);
registerWorkbenchContribution2(ChatQuotasStatusBarEntry.ID, ChatQuotasStatusBarEntry, WorkbenchPhase.Eventually);

registerChatActions();
registerChatCopyActions();
registerChatCodeBlockActions();
registerChatCodeCompareBlockActions();
registerChatFileTreeActions();
registerChatTitleActions();
registerChatExecuteActions();
registerQuickChatActions();
registerChatExportActions();
registerMoveActions();
registerNewChatActions();
registerChatContextActions();
registerChatDeveloperActions();
registerChatEditorActions();

registerEditorFeature(ChatPasteProvidersFeature);
registerEditorContribution(ChatEditorController.ID, ChatEditorController, EditorContributionInstantiation.Eventually);
registerEditorContribution(ChatEditorOverlayController.ID, ChatEditorOverlayController, EditorContributionInstantiation.Eventually);

registerSingleton(IChatService, ChatService, InstantiationType.Delayed);
registerSingleton(IChatWidgetService, ChatWidgetService, InstantiationType.Delayed);
registerSingleton(IQuickChatService, QuickChatService, InstantiationType.Delayed);
registerSingleton(IChatAccessibilityService, ChatAccessibilityService, InstantiationType.Delayed);
registerSingleton(IChatWidgetHistoryService, ChatWidgetHistoryService, InstantiationType.Delayed);
registerSingleton(ILanguageModelsService, LanguageModelsService, InstantiationType.Delayed);
registerSingleton(ILanguageModelStatsService, LanguageModelStatsService, InstantiationType.Delayed);
registerSingleton(IChatSlashCommandService, ChatSlashCommandService, InstantiationType.Delayed);
registerSingleton(IChatAgentService, ChatAgentService, InstantiationType.Delayed);
registerSingleton(IChatAgentNameService, ChatAgentNameService, InstantiationType.Delayed);
registerSingleton(IChatVariablesService, ChatVariablesService, InstantiationType.Delayed);
registerSingleton(ILanguageModelToolsService, LanguageModelToolsService, InstantiationType.Delayed);
registerSingleton(IVoiceChatService, VoiceChatService, InstantiationType.Delayed);
registerSingleton(IChatCodeBlockContextProviderService, ChatCodeBlockContextProviderService, InstantiationType.Delayed);
registerSingleton(ICodeMapperService, CodeMapperService, InstantiationType.Delayed);
registerSingleton(IChatEditingService, ChatEditingService, InstantiationType.Delayed);
registerSingleton(IChatMarkdownAnchorService, ChatMarkdownAnchorService, InstantiationType.Delayed);
registerSingleton(ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService, InstantiationType.Delayed);
registerSingleton(IChatQuotasService, ChatQuotasService, InstantiationType.Delayed);
