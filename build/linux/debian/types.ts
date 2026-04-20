export type DebianArchString = 'amd64' | 'armhf' | 'arm64';

export function isDebianArchString(s: string): s is DebianArchString {
	return ['amd64', 'armhf', 'arm64'].includes(s);
}
