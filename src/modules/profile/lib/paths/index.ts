import { isUuid } from '$shared/lib/ids';

/** The «Προφίλ» tab, and the addresses of screen 55 under it (D-W4-20): the list, a new relative, one relative. */
export const profilePath = '/profile';
export const relativesPath = '/profile/relatives';
export const newRelativePath = '/profile/relatives/new';

/** One relative's form (`/profile/relatives/<relativeId>`), its id encoded as every address of the site. */
export function relativePath(relativeId: string): string {
	return `${relativesPath}/${encodeURIComponent(relativeId)}`;
}

/**
 * What `/profile/[...path]` shows (D-W4-51: the 4.5 comes under it too): the «Προφίλ» tab, and screen 55 under it —
 * «Οι συγγενείς μου», «Νέος συγγενής» or one relative's form (D-W4-20, the application's words).
 */
export type ProfileAddress =
	| { view: 'tab' }
	| { view: 'relatives' }
	| { view: 'relative-new' }
	| { view: 'relative-edit'; relativeId: string };

/**
 * 🔴 D-W4-20 / U-65.6: the route's rest (`''`, `relatives`, `relatives/new`, `relatives/<id>`) read against the closed
 * list — `undefined` for anything else (a 404): another word, an id that is not the server's, one level too deep.
 */
export function readProfileAddress(rest: string | undefined): ProfileAddress | undefined {
	const [head, ...tail] = (rest ?? '').split('/');
	if (!head && tail.length === 0) return { view: 'tab' };
	if (head !== 'relatives' || tail.length > 1) return undefined;
	const [segment] = tail;
	if (segment === undefined) return { view: 'relatives' };
	if (segment === 'new') return { view: 'relative-new' };
	return isUuid(segment) ? { view: 'relative-edit', relativeId: segment } : undefined;
}
