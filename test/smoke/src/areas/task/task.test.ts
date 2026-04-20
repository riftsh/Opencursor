import { Logger } from '../../../../automation';
import { installAllHandlers } from '../../utils';
import { setup as setupTaskQuickPickTests } from './task-quick-pick.test';

export function setup(logger: Logger) {
	describe('Task', function () {

		// Retry tests 3 times to minimize build failures due to any flakiness
		this.retries(3);

		// Shared before/after handling
		installAllHandlers(logger);

		// Refs github.com/riftsh/opencursor/issues/225250
		// Pty spawning fails with invalid fd error in product CI while development CI
		// works fine, we need additional logging to investigate.
		setupTaskQuickPickTests({ skipSuite: process.platform === 'linux' });
	});
}
