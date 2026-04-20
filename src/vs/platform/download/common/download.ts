import { CancellationToken } from '../../../base/common/cancellation.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';

export const IDownloadService = createDecorator<IDownloadService>('downloadService');

export interface IDownloadService {

	readonly _serviceBrand: undefined;

	download(uri: URI, to: URI, cancellationToken?: CancellationToken): Promise<void>;

}
