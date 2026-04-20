import * as vscode from 'vscode';
import { AIProviderManager } from './aiProviderManager';
import { ChatWebviewProvider } from './chatWebviewProvider';

export class OpenCursorAgent {
    private context: vscode.ExtensionContext;
    private aiProviderManager: AIProviderManager;
    private chatProvider: ChatWebviewProvider;
    private statusBarItem: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.aiProviderManager = new AIProviderManager();
        this.chatProvider = new ChatWebviewProvider(context.extensionUri);
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = '$(robot) OpenCursor';
        this.statusBarItem.tooltip = 'OpenCursor Agent - Ready';
        this.statusBarItem.command = 'opencursor.openChat';
    }

    public async initialize(): Promise<void> {
        // Register the chat webview provider
        this.context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('opencursorChatView', this.chatProvider)
        );

        // Add status bar to subscriptions
        this.context.subscriptions.push(this.statusBarItem);
        this.statusBarItem.show();

        // Initialize AI providers
        await this.aiProviderManager.initialize();
        
        console.log('OpenCursor Agent initialized successfully');
    }

    public openChat(): void {
        // Show the chat panel
        vscode.commands.executeCommand('opencursorChatView.focus');
    }

    public async processMessage(message: string, context?: string): Promise<string> {
        try {
            this.updateStatus('Thinking...', '$(pulse)');
            
            const config = vscode.workspace.getConfiguration('opencursor');
            const provider = config.get<string>('provider', 'claude-3.5-sonnet');
            
            const response = await this.aiProviderManager.generateResponse(
                message,
                provider,
                context
            );
            
            this.updateStatus('Ready', '$(robot)');
            return response;
            
        } catch (error) {
            this.updateStatus('Error', '$(error)');
            throw error;
        }
    }

    public async executeCode(code: string, language: string): Promise<any> {
        // Code execution capabilities
        try {
            this.updateStatus('Executing...', '$(loading~spin)');
            
            // Create a temporary terminal for execution
            const terminal = vscode.window.createTerminal({
                name: 'OpenCursor Execution',
                hideFromUser: true
            });
            
            return new Promise((resolve, reject) => {
                terminal.sendText(code);
                
                // Listen for output
                const disposable = vscode.window.onDidWriteTerminalData(e => {
                    if (e.terminal === terminal) {
                        terminal.dispose();
                        disposable.dispose();
                        resolve(e.data);
                    }
                });
                
                // Timeout after 30 seconds
                setTimeout(() => {
                    terminal.dispose();
                    disposable.dispose();
                    reject(new Error('Execution timeout'));
                }, 30000);
            });
            
        } catch (error) {
            this.updateStatus('Error', '$(error)');
            throw error;
        }
    }

    private updateStatus(text: string, icon: string): void {
        this.statusBarItem.text = `${icon} OpenCursor: ${text}`;
        this.statusBarItem.tooltip = `OpenCursor Agent - ${text}`;
    }

    public dispose(): void {
        this.statusBarItem.dispose();
        this.chatProvider.dispose();
    }
}
