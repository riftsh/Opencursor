import { Server } from '../../node/ipc.cp.js';
import { TestChannel, TestService } from './testService.js';

const server = new Server('test');
const service = new TestService();
server.registerChannel('test', new TestChannel(service));
