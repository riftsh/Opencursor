import { URI } from '../../../../../base/common/uri.js';
import { isURLDomainTrusted, ITrustedDomainService } from '../../browser/trustedDomainService.js';

export class MockTrustedDomainService implements ITrustedDomainService {
	_serviceBrand: undefined;

	constructor(private readonly _trustedDomains: string[] = []) {
	}

	isValid(resource: URI): boolean {
		return isURLDomainTrusted(resource, this._trustedDomains);
	}
}
