// Test stand-in for SvelteKit's `$app/paths` virtual module.
export const base = '';
export const assets = '';
export function resolve(path: string): string {
	return path;
}
export function resolveRoute(path: string): string {
	return path;
}
