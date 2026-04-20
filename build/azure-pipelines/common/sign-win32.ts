import { main } from './sign';
import * as path from 'path';

main([
	process.env['EsrpCliDllPath']!,
	'sign-windows',
	path.dirname(process.argv[2]),
	path.basename(process.argv[2])
]);
