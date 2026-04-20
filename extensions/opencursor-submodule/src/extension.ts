import * as vscode from 'vscode';
import { OpenCursorAgent } from './opencursorAgent';
import { InlineChatProvider } from './inlineChatProvider';
import { TerminalExecutor } from './terminalExecutor';
import { MultiAgentManager } from './multiAgentManager';

let agent: OpenCursorAgent;
let inlineChatProvider: InlineChatProvider;
let terminalExecutor: TerminalExecutor;
let multiAgentManager: MultiAgentManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('OpenCursor Agent is now active!');

    // Initialize core components
    agent = new OpenCursorAgent(context);
    inlineChatProvider = new InlineChatProvider(context);
    terminalExecutor = new TerminalExecutor(context);
    multiAgentManager = new MultiAgentManager(context);

    // Register commands
    const openChatCommand = vscode.commands.registerCommand('opencursor.openChat', () => {
        agent.openChat();
    });

    const inlineChatCommand = vscode.commands.registerCommand('opencursor.inlineChat', () => {
        inlineChatProvider.startInlineChat();
    });

    const executeTerminalCommand = vscode.commands.registerCommand('opencursor.executeTerminal', () => {
        terminalExecutor.showCommandInput();
    });

    const multiAgentSessionCommand = vscode.commands.registerCommand('opencursor.multiAgentSession', () => {
        multiAgentManager.startSession();
    });

    // Register all commands
    context.subscriptions.push(
        openChatCommand,
        inlineChatCommand,
        executeTerminalCommand,
        multiAgentSessionCommand
    );

    // Register inline chat provider
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, inlineChatProvider)
    );

    // Initialize the agent
    agent.initialize();

    // Show welcome message
    vscode.window.showInformationMessage(
        'OpenCursor Agent activated! Press Cmd+L for inline chat, Cmd+Shift+I for full chat panel.'
    );
}

export function deactivate() {
    if (agent) {
        agent.dispose();
    }
    if (multiAgentManager) {
        multiAgentManager.dispose();
    }
}
