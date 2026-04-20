export interface IConfig {
	// The client ID of the GitHub OAuth app
	gitHubClientId: string;
	gitHubClientSecret?: string;
}

// For easy access to mixin client ID and secret
export const Config: IConfig = {
	gitHubClientId: '01ab8ac9400c4e429b23'
};
