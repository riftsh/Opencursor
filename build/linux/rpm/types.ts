export type RpmArchString = 'x86_64' | 'armv7hl' | 'aarch64';

export function isRpmArchString(s: string): s is RpmArchString {
	return ['x86_64', 'armv7hl', 'aarch64'].includes(s);
}
