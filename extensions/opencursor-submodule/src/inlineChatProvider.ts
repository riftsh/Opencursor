import * as vscode from 'vscode';
import { OpenCursorAgent } from './opencursorAgent';

export class InlineChatProvider implements vscode.InlineCompletionItemProvider {
    private context: vscode.ExtensionContext;
    private agent: OpenCursorAgent | null = null;
    private decorationType: vscode.TextEditorDecorationType;
    private currentInlineChat: vscode.TextEditorDecorationType | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        
        // Create decoration for inline chat
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(100, 100, 255, 0.1)',
            border: '1px solid rgba(100, 100, 255, 0.3)',
            borderRadius: '3px'
        });
    }

    public async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[]> {
        // Only provide completions when explicitly triggered
        if (context.triggerKind !== vscode.InlineCompletionTriggerKind.Invoke) {
            return [];
        }

        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);
        
        // Check if this looks like a request for AI help
        if (this.isAIRequest(textBeforeCursor)) {
            const suggestion = await this.generateInlineSuggestion(document, position);
            if (suggestion) {
                return [new vscode.InlineCompletionItem(suggestion, new vscode.Range(position, position))];
            }
        }

        return [];
    }

    public startInlineChat(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const position = editor.selection.active;
        this.showInlineChatInterface(editor, position);
    }

    private showInlineChatInterface(editor: vscode.TextEditor, position: vscode.Position): void {
        // Create inline chat input
        const inputBox = vscode.window.createInputBox();
        inputBox.placeholder = 'Ask OpenCursor Agent anything... (Ctrl+Enter to send, Escape to cancel)';
        inputBox.prompt = 'Inline Chat with OpenCursor Agent';

        inputBox.onDidAccept(async () => {
            const query = inputBox.value;
            inputBox.hide();

            if (query.trim()) {
                await this.processInlineQuery(editor, position, query);
            }
        });

        inputBox.onDidHide(() => {
            inputBox.dispose();
        });

        // Handle keyboard shortcuts
        inputBox.onDidChangeValue(() => {
            // Update suggestions as user types
        });

        inputBox.show();
    }

    private async processInlineQuery(
        editor: vscode.TextEditor, 
        position: vscode.Position, 
        query: string
    ): Promise<void> {
        try {
            // Show loading indicator
            await this.showLoadingIndicator(editor, position);

            // Get context around the cursor
            const context = this.getDocumentContext(editor.document, position);
            
            // Get response from agent
            const agent = this.getAgent();
            const response = await agent.processMessage(query, context);

            // Apply the response
            await this.applyInlineResponse(editor, position, response);

        } catch (error) {
            vscode.window.showErrorMessage(`Inline chat error: ${error}`);
        } finally {
            this.hideLoadingIndicator();
        }
    }

    private async showLoadingIndicator(editor: vscode.TextEditor, position: vscode.Position): Promise<void> {
        const range = new vscode.Range(position, position.translate(0, 1));
        this.currentInlineChat = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 255, 0, 0.2)',
            after: {
                contentText: '🤔 Thinking...',
                color: '#888888'
            }
        });
        
        editor.setDecorations(this.currentInlineChat, [range]);
    }

    private hideLoadingIndicator(): void {
        if (this.currentInlineChat) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.setDecorations(this.currentInlineChat, []);
            }
            this.currentInlineChat.dispose();
            this.currentInlineChat = null;
        }
    }

    private async applyInlineResponse(
        editor: vscode.TextEditor, 
        position: vscode.Position, 
        response: string
    ): Promise<void> {
        // Parse response to determine if it's code, explanation, or modification
        if (this.isCodeResponse(response)) {
            await this.insertCode(editor, position, response);
        } else if (this.isModificationResponse(response)) {
            await this.applyModifications(editor, response);
        } else {
            await this.showExplanation(response);
        }
    }

    private async insertCode(editor: vscode.TextEditor, position: vscode.Position, code: string): Promise<void> {
        const cleanedCode = this.extractCodeFromResponse(code);
        await editor.edit(editBuilder => {
            editBuilder.insert(position, cleanedCode);
        });
    }

    private async applyModifications(editor: vscode.TextEditor, modifications: string): Promise<void> {
        // Parse and apply code modifications
        const lines = modifications.split('\n');
        for (const line of lines) {
            if (line.includes('replace:') || line.includes('insert:') || line.includes('delete:')) {
                // Apply the modification
                await this.applyModification(editor, line);
            }
        }
    }

    private async showExplanation(explanation: string): Promise<void> {
        // Show explanation in a temporary notification or tooltip
        const message = explanation.length > 200 ? 
            explanation.substring(0, 200) + '...' : 
            explanation;
            
        vscode.window.showInformationMessage(message, 'Show More').then(selection => {
            if (selection === 'Show More') {
                // Show full explanation in a new document
                vscode.workspace.openTextDocument({ 
                    content: explanation, 
                    language: 'markdown' 
                }).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            }
        });
    }

    private getDocumentContext(document: vscode.TextDocument, position: vscode.Position): string {
        const startLine = Math.max(0, position.line - 10);
        const endLine = Math.min(document.lineCount - 1, position.line + 10);
        const range = new vscode.Range(startLine, 0, endLine, 0);
        
        return document.getText(range);
    }

    private isAIRequest(text: string): boolean {
        const aiTriggers = [
            '// help', '# help', '/* help', 'how to', 'explain', 'refactor',
            'optimize', 'debug', 'fix', 'implement', 'write', 'create'
        ];
        
        return aiTriggers.some(trigger => 
            text.toLowerCase().includes(trigger.toLowerCase())
        );
    }

    private async generateInlineSuggestion(
        document: vscode.TextDocument, 
        position: vscode.Position
    ): Promise<string> {
        // Generate contextual suggestions
        const line = document.lineAt(position.line);
        const text = line.text.trim();
        
        if (text.endsWith('function')) {
            return '() {\n    // TODO: implement\n}';
        }
        
        if (text.includes('import')) {
            return ' from "module";';
        }
        
        return '';
    }

    private isCodeResponse(response: string): boolean {
        return response.includes('```') || /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/.test(response.trim());
    }

    private isModificationResponse(response: string): boolean {
        return response.includes('replace:') || response.includes('insert:') || response.includes('delete:');
    }

    private extractCodeFromResponse(response: string): string {
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
        return codeMatch ? codeMatch[1] : response;
    }

    private async applyModification(editor: vscode.TextEditor, modification: string): Promise<void> {
        // Parse modification like "replace:oldText:newText" or "insert:line:text"
        const parts = modification.split(':');
        if (parts.length < 2) return;

        const action = parts[0];
        
        switch (action) {
            case 'replace':
                // Handle replacement
                break;
            case 'insert':
                // Handle insertion
                break;
            case 'delete':
                // Handle deletion
                break;
        }
    }

    private getAgent(): OpenCursorAgent {
        if (!this.agent) {
            // Get agent from extension context
            this.agent = new OpenCursorAgent(this.context);
        }
        return this.agent;
    }

    public dispose(): void {
        this.decorationType.dispose();
        if (this.currentInlineChat) {
            this.currentInlineChat.dispose();
        }
    }
}
