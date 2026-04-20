import { createDecorator } from '../../instantiation/common/instantiation.js';

export const IStateReadService = createDecorator<IStateReadService>('stateReadService');
export interface IStateReadService {

	readonly _serviceBrand: undefined;

	getItem<T>(key: string, defaultValue: T): T;
	getItem<T>(key: string, defaultValue?: T): T | undefined;

}

export const IStateService = createDecorator<IStateService>('stateService');
export interface IStateService extends IStateReadService {

	readonly _serviceBrand: undefined;

	setItem(key: string, data?: object | string | number | boolean | undefined | null): void;
	setItems(items: readonly { key: string; data?: object | string | number | boolean | undefined | null }[]): void;

	removeItem(key: string): void;

	close(): Promise<void>;
}
