import * as vscode from 'vscode';
import { OpenCursorAgent } from './opencursorAgent';

export class ChatWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'opencursorChatView';
    private _view?: vscode.WebviewView;
    private agent: OpenCursorAgent | null = null;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleUserMessage(data.message);
                    break;
                case 'clearChat':
                    this.clearChat();
                    break;
                case 'executeCommand':
                    await this.executeTerminalCommand(data.command);
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'opencursor');
                    break;
            }
        });
    }

    private async handleUserMessage(message: string): Promise<void> {
        if (!this._view) return;

        // Add user message to chat
        this.addMessageToChat('user', message);

        try {
            // Show typing indicator
            this.showTypingIndicator();

            // Get response from agent
            const agent = this.getAgent();
            const response = await agent.processMessage(message);

            // Add AI response to chat
            this.addMessageToChat('assistant', response);

        } catch (error) {
            this.addMessageToChat('error', `Error: ${error}`);
        } finally {
            this.hideTypingIndicator();
        }
    }

    private addMessageToChat(role: 'user' | 'assistant' | 'system' | 'error', content: string): void {
        if (!this._view) return;

        this._view.webview.postMessage({
            type: 'addMessage',
            role,
            content,
            timestamp: new Date().toISOString()
        });
    }

    private showTypingIndicator(): void {
        if (!this._view) return;

        this._view.webview.postMessage({
            type: 'showTyping'
        });
    }

    private hideTypingIndicator(): void {
        if (!this._view) return;

        this._view.webview.postMessage({
            type: 'hideTyping'
        });
    }

    private clearChat(): void {
        if (!this._view) return;

        this._view.webview.postMessage({
            type: 'clearChat'
        });
    }

    private async executeTerminalCommand(command: string): Promise<void> {
        try {
            // Execute terminal command and show result
            const agent = this.getAgent();
            const result = await agent.executeCode(command, 'bash');
            
            this.addMessageToChat('system', `Command executed:\n\`${command}\`\n\nResult:\n\`\`\`\n${result}\n\`\`\``);
            
        } catch (error) {
            this.addMessageToChat('error', `Command execution failed: ${error}`);
        }
    }

    private getAgent(): OpenCursorAgent {
        if (!this.agent) {
            // This should be properly injected
            throw new Error('Agent not initialized');
        }
        return this.agent;
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'script.js'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>OpenCursor Agent</title>
            </head>
            <body>
                <div class="container">
                    <header class="header">
                        <h1>🤖 OpenCursor Agent</h1>
                        <div class="header-actions">
                            <button id="clearChatBtn" title="Clear Chat">🗑️</button>
                            <button id="settingsBtn" title="Settings">⚙️</button>
                        </div>
                    </header>

                    <div class="chat-container">
                        <div id="messages" class="messages"></div>
                        <div id="typingIndicator" class="typing-indicator hidden">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>

                    <div class="input-container">
                        <div class="input-wrapper">
                            <textarea 
                                id="messageInput" 
                                placeholder="Ask OpenCursor Agent anything... (Shift+Enter for new line, Enter to send)"
                                rows="1"
                            ></textarea>
                            <button id="sendBtn" title="Send Message">🚀</button>
                        </div>
                        <div class="quick-actions">
                            <button class="quick-btn" data-action="explain">Explain Code</button>
                            <button class="quick-btn" data-action="refactor">Refactor</button>
                            <button class="quick-btn" data-action="debug">Debug</button>
                            <button class="quick-btn" data-action="test">Generate Tests</button>
                        </div>
                    </div>
                </div>

                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    public dispose(): void {
        // Cleanup if needed
    }
}
