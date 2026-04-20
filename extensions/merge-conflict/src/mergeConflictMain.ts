import * as vscode from 'vscode';
import MergeConflictServices from './services';

export function activate(context: vscode.ExtensionContext) {
	// Register disposables
	const services = new MergeConflictServices(context);
	services.begin();
	context.subscriptions.push(services);
}

export function deactivate() {
}

