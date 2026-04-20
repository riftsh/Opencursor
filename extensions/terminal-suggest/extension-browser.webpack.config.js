//@ts-check

'use strict';

const withBrowserDefaults = require('../shared.webpack.config').browser;

module.exports = withBrowserDefaults({
	context: __dirname,
	entry: {
		extension: './src/terminalSuggestMain.ts'
	},
	output: {
		filename: 'terminalSuggestMain.js'
	},
	resolve: {
		fallback: {
			'child_process': false
		}
	}
});
