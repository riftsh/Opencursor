import * as vscode from 'vscode';
import { OpenCursorAgent } from './opencursorAgent';

export class TerminalExecutor {
    private context: vscode.ExtensionContext;
    private terminal: vscode.Terminal | null = null;
    private outputChannel: vscode.OutputChannel;
    private agent: OpenCursorAgent | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('OpenCursor Terminal');
    }

    public showCommandInput(): void {
        const inputBox = vscode.window.createInputBox();
        inputBox.placeholder = 'Enter terminal command (or describe what you want to do)...';
        inputBox.prompt = 'OpenCursor Terminal Command Executor';

        inputBox.onDidAccept(async () => {
            const command = inputBox.value.trim();
            inputBox.hide();

            if (command) {
                await this.executeCommand(command);
            }
        });

        inputBox.onDidHide(() => {
            inputBox.dispose();
        });

        inputBox.show();
    }

    public async executeCommand(command: string): Promise<string> {
        try {
            this.outputChannel.appendLine(`> ${command}`);
            this.outputChannel.show();

            // Check if this is a natural language command that needs AI interpretation
            if (this.isNaturalLanguageCommand(command)) {
                command = await this.interpretCommand(command);
            }

            // Execute the command
            const result = await this.runTerminalCommand(command);

            this.outputChannel.appendLine(result);
            return result;

        } catch (error) {
            const errorMsg = `Error executing command: ${error}`;
            this.outputChannel.appendLine(errorMsg);
            vscode.window.showErrorMessage(errorMsg);
            throw error;
        }
    }

    private async interpretCommand(naturalCommand: string): Promise<string> {
        const agent = this.getAgent();

        const prompt = `Convert this natural language request into a terminal command:
Request: "${naturalCommand}"
Return only the command, no explanation.`;

        try {
            const response = await agent.processMessage(prompt);
            return response.trim().replace(/["`']/g, '');
        } catch (error) {
            vscode.window.showWarningMessage(`Could not interpret command: ${naturalCommand}`);
            return naturalCommand;
        }
    }

    private async runTerminalCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.terminal) {
                this.terminal = vscode.window.createTerminal({
                    name: 'OpenCursor Executor',
                    hideFromUser: true
                });
            }

            let output = '';
            let commandCompleted = false;

            // Listen for terminal output
            const outputDisposable = vscode.window.onDidWriteTerminalData(e => {
                if (e.terminal === this.terminal) {
                    output += e.data;

                    // Check for command completion indicators
                    if (e.data.includes('$') || e.data.includes('%') || e.data.includes('>')) {
                        if (!commandCompleted && output.length > command.length) {
                            commandCompleted = true;
                            cleanup();
                            resolve(output);
                        }
                    }
                }
            });

            // Listen for terminal close
            const closeDisposable = vscode.window.onDidCloseTerminal(e => {
                if (e === this.terminal) {
                    this.terminal = null;
                    if (!commandCompleted) {
                        cleanup();
                        resolve(output);
                    }
                }
            });

            const cleanup = () => {
                outputDisposable.dispose();
                closeDisposable.dispose();
            };

            // Set timeout for long-running commands
            const timeout = setTimeout(() => {
                if (!commandCompleted) {
                    cleanup();
                    resolve(output + '\n[Command timed out after 30 seconds]');
                }
            }, 30000);

            // Execute the command
            this.terminal.sendText(command);
            this.terminal.show();

            // Clear timeout if command completes
            const originalResolve = resolve;
            resolve = (value: string) => {
                clearTimeout(timeout);
                originalResolve(value);
            };
        });
    }

    private isNaturalLanguageCommand(command: string): boolean {
        const naturalLanguagePatterns = [
            /^(create|make|build|compile|run|start|stop|restart|install|update|delete|remove|list|show|find|search|open|close|check|test|deploy|publish)/i,
            /(show me|list all|find all|create a|make a|build a|run the|start the|stop the)/i,
            /(how to|what is|where is|which files|which directories)/i,
            /(git|npm|yarn|pip|docker|kubectl|aws|azure|gcloud)/i
        ];

        return naturalLanguagePatterns.some(pattern => pattern.test(command));
    }

    public async executeCodeInLanguage(code: string, language: string): Promise<any> {
        const commandMap: { [key: string]: string } = {
            'javascript': 'node',
            'typescript': 'ts-node',
            'python': 'python3',
            'java': 'java',
            'cpp': 'g++ -o temp && ./temp',
            'c': 'gcc -o temp && ./temp',
            'go': 'go run',
            'rust': 'rustc',
            'php': 'php',
            'ruby': 'ruby',
            'swift': 'swift',
            'kotlin': 'kotlin',
            'scala': 'scala'
        };

        const executor = commandMap[language.toLowerCase()];
        if (!executor) {
            throw new Error(`Unsupported language: ${language}`);
        }

        // Create temporary file
        const tempDir = '/tmp/opencursor';
        const extensionMap: { [key: string]: string } = {
            'javascript': '.js',
            'typescript': '.ts',
            'python': '.py',
            'java': '.java',
            'cpp': '.cpp',
            'c': '.c',
            'go': '.go',
            'rust': '.rs',
            'php': '.php',
            'ruby': '.rb',
            'swift': '.swift',
            'kotlin': '.kt',
            'scala': '.scala',
            'dart': '.dart',


        };

        const extension = extensionMap[language.toLowerCase()];
        const tempFile = `${tempDir}/temp${extension}`;

        try {
            // Create temp directory and write code
            await this.executeCommand(`mkdir -p ${tempDir}`);

            // Write code to file (using echo and redirection)
            const escapedCode = code.replace(/"/g, '\\"').replace(/\$/g, '\\$');
            await this.executeCommand(`echo "${escapedCode}" > ${tempFile}`);

            // Execute the code
            let command = executor;
            if (language.toLowerCase() === 'java') {
                // Special handling for Java
                const className = this.extractJavaClassName(code);
                command = `javac ${tempFile} && cd ${tempDir} && java ${className}`;
            } else if (language.toLowerCase() === 'cpp' || language.toLowerCase() === 'c') {
                // Special handling for C/C++
                command = `${executor.split('&&')[0]} ${tempFile} && ${tempDir}/temp`;
            } else {
                command = `${executor} ${tempFile}`;
            }

            const result = await this.executeCommand(command);

            // Cleanup
            await this.executeCommand(`rm -f ${tempFile} ${tempDir}/temp`);

            return result;

        } catch (error) {
            // Cleanup on error
            await this.executeCommand(`rm -f ${tempFile} ${tempDir}/temp`);
            throw error;
        }
    }

    private extractJavaClassName(code: string): string {
        const match = code.match(/public\s+class\s+(\w+)/);
        return match ? match[1] : 'Temp';
    }

    public async executeShellScript(script: string): Promise<string> {
        const tempScript = '/tmp/opencursor_script.sh';

        try {
            // Write script to file
            const escapedScript = script.replace(/"/g, '\\"').replace(/\$/g, '\\$');
            await this.executeCommand(`echo "${escapedScript}" > ${tempScript}`);
            await this.executeCommand(`chmod +x ${tempScript}`);

            // Execute script
            const result = await this.executeCommand(`bash ${tempScript}`);

            // Cleanup
            await this.executeCommand(`rm -f ${tempScript}`);

            return result;

        } catch (error) {
            // Cleanup on error
            await this.executeCommand(`rm -f ${tempScript}`);
            throw error;
        }
    }

    public async getSystemInfo(): Promise<{ [key: string]: string }> {
        const info: { [key: string]: string } = {};

        try {
            info.os = await this.executeCommand('uname -s');
            info.arch = await this.executeCommand('uname -m');
            info.kernel = await this.executeCommand('uname -r');
            info.shell = await this.executeCommand('echo $SHELL');
            info.terminal = await this.executeCommand('echo $TERM');
            info.user = await this.executeCommand('whoami');
            info.home = await this.executeCommand('echo $HOME');
            info.pwd = await this.executeCommand('pwd');
            info.date = await this.executeCommand('date');

            // Get memory info
            if (info.os.includes('Darwin')) {
                info.memory = await this.executeCommand('vm_stat | grep "Pages free"');
            } else {
                info.memory = await this.executeCommand('free -h');
            }

        } catch (error) {
            console.error('Error getting system info:', error);
        }

        return info;
    }

    private getAgent(): OpenCursorAgent {
        if (!this.agent) {
            this.agent = new OpenCursorAgent(this.context);
        }
        return this.agent;
    }

    public dispose(): void {
        if (this.terminal) {
            this.terminal.dispose();
        }
        this.outputChannel.dispose();
    }
}
console.log("if you found uwu")
