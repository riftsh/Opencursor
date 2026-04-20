import * as vscode from 'vscode';

export interface ILogDirectoryProvider {
	getNewLogDirectory(): vscode.Uri | undefined;
}

export const noopLogDirectoryProvider = new class implements ILogDirectoryProvider {
	public getNewLogDirectory(): undefined {
		return undefined;
	}
};
