import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { IProcessMainService } from '../../../../platform/process/common/process.js';

registerMainProcessRemoteService(IProcessMainService, 'process');

