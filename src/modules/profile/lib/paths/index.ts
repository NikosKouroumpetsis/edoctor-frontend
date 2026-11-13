import { isUuid } from '$shared/lib/ids';
import { settingsPages, settingsSections } from '$modules/profile/config/settings';
import type { SettingsPageId, SettingsSectionId } from '$modules/profile/types';

/** The «Προφίλ» tab, and the addresses of screen 55 under it (D-W4-20): the list, a new relative, one relative. */
export const profilePath = '/profile';
export const relativesPath = '/profile/relatives';
export const newRelativePath = '/profile/relatives/new';

/** One relative's form (`/profile/relatives/<relativeId>`), its id encoded as every address of the site. */
export function relativePath(relativeId: string): string {
	return `${relativesPath}/${encodeURIComponent(relativeId)}`;
}

/** Wave 4.5 · screen 57 (D-W45-01): «Ρυθμίσεις λογαριασμού», the application's word; its sections come under it. */
export const accountSettingsPath = '/profile/account-settings';

const settingsRoute = accountSettingsPath.slice(profilePath.length + 1);

/** A section's own address (D-W45-01, the register's `route` under `/profile`): `/profile/account-settings/language`. */
export function settingsSectionPath(section: SettingsSectionId): string {
	const route = settingsSections.find((seed) => seed.id === section)?.route;
	return route ? `${profilePath}/${route}` : accountSettingsPath;
}

/** A page a section opens (screen 62, D-W45-01): `/profile/third-party-tools`, `/profile/account-settings/deletion`, `…/code`. */
export function settingsPagePath(page: SettingsPageId): string {
	const route = settingsPages.find((seed) => seed.id === page)?.route;
	return route ? `${profilePath}/${route}` : accountSettingsPath;
}

/**
 * What `/profile/[...path]` shows (D-W4-51: the 4.5 comes under it too): the «Προφίλ» tab, and screen 55 under it —
 * «Οι συγγενείς μου», «Νέος συγγενής» or one relative's form (D-W4-20, the application's words) — and, since wave 4.5
 * (D-W45-01), «Ρυθμίσεις λογαριασμού»: the shell alone (its list; from 950 its first section), one section of it, or
 * (screen 62) a page that section opens — `page` with its `section`, never alone.
 */
export type ProfileAddress =
	| { view: 'tab' }
	| { view: 'relatives' }
	| { view: 'relative-new' }
	| { view: 'relative-edit'; relativeId: string }
	| { view: 'settings'; section?: SettingsSectionId; page?: SettingsPageId };

/**
 * 🔴 D-W45-01 / D-W45-02 / U-65.6: the shell's addresses against the register — `account-settings`, and the `route` of
 * a section whose screen is BUILT, and the pages such a section opens (screen 62's three); a section not built yet,
 * another word or a level more is no address (a 404).
 */
function readSettingsAddress(rest: string): ProfileAddress | undefined {
	if (rest === settingsRoute) return { view: 'settings' };
	const section = settingsSections.find((seed) => seed.built && seed.route === rest);
	if (section) return { view: 'settings', section: section.id };
	const page = settingsPages.find((seed) => seed.route === rest);
	const owner = page && settingsSections.find((seed) => seed.built && seed.id === page.section);
	return page && owner ? { view: 'settings', section: owner.id, page: page.id } : undefined;
}

/**
 * 🔴 D-W4-20 / U-65.6: the route's rest (`''`, `relatives`, `relatives/new`, `relatives/<id>`, and since wave 4.5 the
 * shell's `account-settings` and its built sections) read against the closed list — `undefined` for anything else (a
 * 404): another word, an id that is not the server's, one level too deep.
 */
export function readProfileAddress(rest: string | undefined): ProfileAddress | undefined {
	const settings = readSettingsAddress(rest ?? '');
	if (settings) return settings;
	const [head, ...tail] = (rest ?? '').split('/');
	if (!head && tail.length === 0) return { view: 'tab' };
	if (head !== 'relatives' || tail.length > 1) return undefined;
	const [segment] = tail;
	if (segment === undefined) return { view: 'relatives' };
	if (segment === 'new') return { view: 'relative-new' };
	return isUuid(segment) ? { view: 'relative-edit', relativeId: segment } : undefined;
}
