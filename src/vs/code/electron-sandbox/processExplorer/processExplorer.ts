/* eslint-disable no-restricted-globals */

(async function () {

	type IBootstrapWindow = import('vs/platform/window/electron-sandbox/window.js').IBootstrapWindow;
	type IProcessExplorerMain = import('vs/code/electron-sandbox/processExplorer/processExplorerMain.js').IProcessExplorerMain;
	type ProcessExplorerWindowConfiguration = import('vs/platform/process/common/process.js').ProcessExplorerWindowConfiguration;

	const bootstrapWindow: IBootstrapWindow = (window as any).MonacoBootstrapWindow; // defined by bootstrap-window.ts

	const { result, configuration } = await bootstrapWindow.load<IProcessExplorerMain, ProcessExplorerWindowConfiguration>('vs/code/electron-sandbox/processExplorer/processExplorerMain', {
		configureDeveloperSettings: function () {
			return {
				forceEnableDeveloperKeybindings: true
			};
		},
	});

	result.startup(configuration);
}());
