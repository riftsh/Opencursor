import * as vscode from 'vscode';

export function activate(_context: vscode.ExtensionContext) {
	// Set context as a global as some tests depend on it
	(global as any).testExtensionContext = _context;
}
