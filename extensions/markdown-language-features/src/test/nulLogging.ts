import { ILogger } from '../logging';

export const nulLogger = new class implements ILogger {
	verbose(): void {
		// noop
	}
};
