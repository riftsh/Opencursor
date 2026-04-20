import * as processes from '../../../../node/processes.js';

const sender = processes.createQueuedSender(<any>process);

process.on('message', msg => {
	sender.send(msg);
	sender.send(msg);
	sender.send(msg);
	sender.send('done');
});

sender.send('ready');