export interface NewWorkerMessage {
	type: '_newWorker';
	id: string;
	port: any /* MessagePort */;
	url: string;
	options: any /* WorkerOptions */ | undefined;
}

export interface TerminateWorkerMessage {
	type: '_terminateWorker';
	id: string;
}
