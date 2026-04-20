import * as vscode from 'vscode';
import { OpenCursorAgent } from './opencursorAgent';
import { AIProviderManager } from './aiProviderManager';

export interface Agent {
    id: string;
    name: string;
    provider: string;
    role: 'coder' | 'reviewer' | 'debugger' | 'architect' | 'tester' | 'optimizer';
    status: 'idle' | 'working' | 'completed' | 'error';
    confidence: number;
    output?: string;
}

export interface MultiAgentSession {
    id: string;
    task: string;
    agents: Agent[];
    startTime: Date;
    status: 'active' | 'completed' | 'failed';
    result?: string;
}

export class MultiAgentManager {
    private context: vscode.ExtensionContext;
    private sessions: Map<string, MultiAgentSession> = new Map();
    private agent: OpenCursorAgent | null = null;
    private aiProviderManager: AIProviderManager;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.aiProviderManager = new AIProviderManager();
        this.outputChannel = vscode.window.createOutputChannel('OpenCursor Multi-Agent');
    }

    public startSession(): void {
        const inputBox = vscode.window.createInputBox();
        inputBox.placeholder = 'Describe the task for multi-agent collaboration...';
        inputBox.prompt = 'OpenCursor Multi-Agent Session';

        inputBox.onDidAccept(async () => {
            const task = inputBox.value.trim();
            inputBox.hide();

            if (task) {
                await this.createMultiAgentSession(task);
            }
        });

        inputBox.onDidHide(() => {
            inputBox.dispose();
        });

        inputBox.show();
    }

    private async createMultiAgentSession(task: string): Promise<void> {
        const sessionId = this.generateSessionId();
        const session: MultiAgentSession = {
            id: sessionId,
            task,
            agents: [],
            startTime: new Date(),
            status: 'active'
        };

        // Analyze task and determine which agents are needed
        const requiredAgents = this.analyzeTaskRequirements(task);
        
        // Create agents
        for (const agentConfig of requiredAgents) {
            const agent = await this.createAgent(agentConfig);
            session.agents.push(agent);
        }

        this.sessions.set(sessionId, session);
        this.outputChannel.appendLine(`\n🚀 Starting multi-agent session: ${sessionId}`);
        this.outputChannel.appendLine(`📋 Task: ${task}`);
        this.outputChannel.appendLine(`👥 Agents: ${session.agents.map(a => a.name).join(', ')}`);
        this.outputChannel.show();

        // Start the collaboration
        await this.runCollaborativeSession(session);
    }

    private analyzeTaskRequirements(task: string): Array<{role: Agent['role'], provider: string}> {
        const agents: Array<{role: Agent['role'], provider: string}> = [];
        
        const taskLower = task.toLowerCase();
        
        // Always include a primary coder
        agents.push({ role: 'coder', provider: 'claude-3.5-sonnet' });
        
        // Add specialized agents based on task content
        if (taskLower.includes('debug') || taskLower.includes('fix') || taskLower.includes('error')) {
            agents.push({ role: 'debugger', provider: 'gpt-4' });
        }
        
        if (taskLower.includes('review') || taskLower.includes('check') || taskLower.includes('quality')) {
            agents.push({ role: 'reviewer', provider: 'o1-preview' });
        }
        
        if (taskLower.includes('test') || taskLower.includes('testing') || taskLower.includes('unit test')) {
            agents.push({ role: 'tester', provider: 'gpt-4-turbo' });
        }
        
        if (taskLower.includes('architecture') || taskLower.includes('design') || taskLower.includes('structure')) {
            agents.push({ role: 'architect', provider: 'claude-3-opus' });
        }
        
        if (taskLower.includes('optimize') || taskLower.includes('performance') || taskLower.includes('speed')) {
            agents.push({ role: 'optimizer', provider: 'deepseek-coder' });
        }
        
        // For complex tasks, add more agents
        if (taskLower.length > 100 || taskLower.split(' ').length > 20) {
            agents.push({ role: 'reviewer', provider: 'gemini-pro' });
        }
        
        return agents;
    }

    private async createAgent(config: {role: Agent['role'], provider: string}): Promise<Agent> {
        const agent: Agent = {
            id: this.generateAgentId(),
            name: `${config.role.charAt(0).toUpperCase() + config.role.slice(1)} Agent`,
            provider: config.provider,
            role: config.role,
            status: 'idle',
            confidence: 0.0
        };

        return agent;
    }

    private async runCollaborativeSession(session: MultiAgentSession): Promise<void> {
        try {
            this.outputChannel.appendLine(`\n🔄 Starting collaborative work...`);
            
            // Get current editor context
            const editor = vscode.window.activeTextEditor;
            let context = '';
            if (editor) {
                const document = editor.document;
                const selection = editor.selection;
                const selectedText = document.getText(selection);
                context = selectedText || document.getText();
            }

            // Phase 1: Parallel work by specialized agents
            const workPromises = session.agents.map(agent => 
                this.executeAgentWork(agent, session.task, context)
            );
            
            const results = await Promise.allSettled(workPromises);
            
            // Phase 2: Conflict resolution and merging
            const mergedResult = await this.resolveConflicts(session, results);
            
            // Phase 3: Final review
            const finalReview = await this.conductFinalReview(session, mergedResult);
            
            session.result = finalReview;
            session.status = 'completed';
            
            this.outputChannel.appendLine(`\n✅ Session completed successfully!`);
            this.outputChannel.appendLine(`\n📄 Final Result:\n${finalReview}`);
            
            // Show result to user
            this.showSessionResult(session);
            
        } catch (error) {
            session.status = 'failed';
            this.outputChannel.appendLine(`\n❌ Session failed: ${error}`);
            vscode.window.showErrorMessage(`Multi-agent session failed: ${error}`);
        }
    }

    private async executeAgentWork(
        agent: Agent, 
        task: string, 
        context: string
    ): Promise<void> {
        agent.status = 'working';
        this.outputChannel.appendLine(`\n🤖 ${agent.name} (${agent.provider}) starting work...`);
        
        try {
            const agent = this.getAgent();
            const specializedPrompt = this.createSpecializedPrompt(agent.role, task, context);
            
            const response = await agent.processMessage(specializedPrompt, context);
            
            agent.output = response;
            agent.confidence = this.calculateConfidence(response, agent.role);
            agent.status = 'completed';
            
            this.outputChannel.appendLine(`✅ ${agent.name} completed (confidence: ${agent.confidence.toFixed(2)})`);
            
        } catch (error) {
            agent.status = 'error';
            agent.output = `Error: ${error}`;
            this.outputChannel.appendLine(`❌ ${agent.name} failed: ${error}`);
        }
    }

    private createSpecializedPrompt(role: Agent['role'], task: string, context: string): string {
        const prompts = {
            coder: `As a coding expert, implement the following task. Focus on clean, efficient, and well-documented code.\nTask: ${task}\nContext: ${context}`,
            reviewer: `As a code reviewer, analyze the following code for quality, security, and best practices. Provide specific improvements.\nTask: ${task}\nContext: ${context}`,
            debugger: `As a debugging specialist, identify and fix issues in the following code. Explain the root causes.\nTask: ${task}\nContext: ${context}`,
            architect: `As a software architect, design the structure and patterns for the following task. Consider scalability and maintainability.\nTask: ${task}\nContext: ${context}`,
            tester: `As a testing expert, create comprehensive tests for the following code. Include unit tests and edge cases.\nTask: ${task}\nContext: ${context}`,
            optimizer: `As a performance optimization specialist, improve the efficiency and speed of the following code.\nTask: ${task}\nContext: ${context}`
        };
        
        return prompts[role] || prompts.coder;
    }

    private async resolveConflicts(
        session: MultiAgentSession, 
        results: PromiseSettledResult<void>[]
    ): Promise<string> {
        this.outputChannel.appendLine(`\n🔧 Resolving conflicts and merging results...`);
        
        const successfulResults = session.agents.filter(a => a.status === 'completed' && a.output);
        
        if (successfulResults.length === 0) {
            return 'No agents completed successfully.';
        }
        
        if (successfulResults.length === 1) {
            return successfulResults[0].output || '';
        }
        
        // Use the highest confidence result as base
        const baseAgent = successfulResults.reduce((prev, current) => 
            current.confidence > prev.confidence ? current : prev
        );
        
        let mergedResult = baseAgent.output || '';
        
        // Merge insights from other agents
        for (const agent of successfulResults) {
            if (agent.id !== baseAgent.id && agent.output) {
                mergedResult = await this.mergeOutputs(mergedResult, agent.output, agent.role);
            }
        }
        
        return mergedResult;
    }

    private async mergeOutputs(base: string, addition: string, role: Agent['role']): Promise<string> {
        const agent = this.getAgent();
        
        const mergePrompt = `Merge these two outputs, taking the best from both. The base output is from a ${baseAgent.role}, the addition is from a ${role}.\n\nBase:\n${base}\n\nAddition:\n${addition}\n\nMerged result:`;
        
        try {
            return await agent.processMessage(mergePrompt);
        } catch (error) {
            // Fallback: simply concatenate
            return `${base}\n\n${role} insights:\n${addition}`;
        }
    }

    private async conductFinalReview(session: MultiAgentSession, result: string): Promise<string> {
        this.outputChannel.appendLine(`\n🔍 Conducting final review...`);
        
        const agent = this.getAgent();
        
        const reviewPrompt = `Review and finalize this multi-agent collaboration result. Ensure it's coherent, complete, and addresses the original task.\n\nOriginal Task: ${session.task}\n\nResult:\n${result}\n\nFinalized result:`;
        
        try {
            const finalResult = await agent.processMessage(reviewPrompt);
            return finalResult;
        } catch (error) {
            return result; // Return original if review fails
        }
    }

    private calculateConfidence(output: string, role: Agent['role']): number {
        // Simple confidence calculation based on output quality
        if (!output) return 0.0;
        
        let confidence = 0.5; // Base confidence
        
        // Length factor
        if (output.length > 100) confidence += 0.1;
        if (output.length > 500) confidence += 0.1;
        
        // Code quality indicators
        if (output.includes('```') || output.includes('function') || output.includes('class')) {
            confidence += 0.2;
        }
        
        // Explanation quality
        if (output.includes('explanation') || output.includes('because') || output.includes('therefore')) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }

    private showSessionResult(session: MultiAgentSession): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'multiAgentResult',
            'Multi-Agent Session Result',
            vscode.ViewColumn.One,
            {}
        );

        const html = this.generateResultHTML(session);
        panel.webview.html = html;

        return Promise.resolve();
    }

    private generateResultHTML(session: MultiAgentSession): string {
        const agentsHTML = session.agents.map(agent => `
            <div class="agent">
                <h3>${agent.name}</h3>
                <p><strong>Provider:</strong> ${agent.provider}</p>
                <p><strong>Role:</strong> ${agent.role}</p>
                <p><strong>Status:</strong> ${agent.status}</p>
                <p><strong>Confidence:</strong> ${(agent.confidence * 100).toFixed(1)}%</p>
                ${agent.output ? `<pre>${agent.output}</pre>` : ''}
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Multi-Agent Session Result</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .agent { border: 1px solid #ccc; margin: 10px 0; padding: 15px; border-radius: 5px; }
                    .agent h3 { margin-top: 0; color: #333; }
                    pre { background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
                    .result { background: #e8f5e8; padding: 15px; border-radius: 5px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <h1>Multi-Agent Session Result</h1>
                <h2>Task: ${session.task}</h2>
                <h2>Agents (${session.agents.length})</h2>
                ${agentsHTML}
                <div class="result">
                    <h2>Final Result</h2>
                    <pre>${session.result || 'No result available'}</pre>
                </div>
            </body>
            </html>
        `;
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateAgentId(): string {
        return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getAgent(): OpenCursorAgent {
        if (!this.agent) {
            this.agent = new OpenCursorAgent(this.context);
        }
        return this.agent;
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
