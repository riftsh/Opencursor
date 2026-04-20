import * as vscode from 'vscode';

const noopDisposable = vscode.Disposable.from();

export const nulToken: vscode.CancellationToken = {
	isCancellationRequested: false,
	onCancellationRequested: () => noopDisposable
};
