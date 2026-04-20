import { Disposable, Event } from 'vscode';
import { RemoteSourceProvider } from './api/git-base';

export interface IRemoteSourceProviderRegistry {
	readonly onDidAddRemoteSourceProvider: Event<RemoteSourceProvider>;
	readonly onDidRemoveRemoteSourceProvider: Event<RemoteSourceProvider>;

	getRemoteProviders(): RemoteSourceProvider[];
	registerRemoteSourceProvider(provider: RemoteSourceProvider): Disposable;
}
