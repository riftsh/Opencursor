import * as vscode from 'vscode';

export interface PackageInfo {
	name: string;
	version: string;
	aiKey: string;
}

export function getPackageInfo(context: vscode.ExtensionContext) {
	const packageJSON = context.extension.packageJSON;
	if (packageJSON && typeof packageJSON === 'object') {
		return {
			name: packageJSON.name ?? '',
			version: packageJSON.version ?? '',
			aiKey: packageJSON.aiKey ?? '',
		};
	}
	return null;
}
