// Delete `VSCODE_CWD` very early. We have seen
// reports where `code .` would use the wrong
// current working directory due to our variable
// somehow escaping to the parent shell
// (github.com/riftsh/opencursor/issues/126399)
delete process.env['VSCODE_CWD'];
