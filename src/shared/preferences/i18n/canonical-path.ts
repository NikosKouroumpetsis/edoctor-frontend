/**
 * 🔴 D-W3-38 (security web, before the wave): the Greek canonical address of a `/el/…` one (Greek lives at `/`). The path
 * keeps ONE leading `/`, whatever slashes or backslashes followed `/el`, so `/el//evil.example` never comes out as
 * `//evil.example` — another host to a browser. `null` for an address outside `/el`.
 */
export function canonicalGreekPath(pathname: string): string | null {
	if (pathname !== '/el' && !pathname.startsWith('/el/')) return null;
	return `/${pathname.slice('/el'.length).replace(/^[/\\]+/u, '')}`;
}
