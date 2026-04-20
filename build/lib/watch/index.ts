const watch = process.platform === 'win32' ? require('./watch-win32') : require('vscode-gulp-watch');

module.exports = function () {
	return watch.apply(null, arguments);
};
