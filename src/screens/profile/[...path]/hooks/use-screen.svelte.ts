import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSiteDialogsOptional } from '$shared/state/site-dialogs';
import type { RelativePhoneSplitter } from '$modules/appointments/lib/relatives';
import type { RelativeMobileParser } from '$modules/appointments/ui/relative-form';
import type { RelativesAddress, RelativesLinks } from '$modules/appointments/ui/relatives';
import { parseIdentifier, readDialCode } from '$modules/auth/lib/identifier';
import {
	newRelativePath,
	profilePath,
	relativePath,
	relativesPath,
	type ProfileAddress
} from '$modules/profile/lib/paths';
import type { ProfileMenuRowId } from '$modules/profile/types';
import type { ProfileScreenData } from '../types';

const pages: Partial<Record<ProfileMenuRowId, string>> = {
	relatives: relativesPath,
	help: '/help',
	legal: '/legal'
};

/**
 * 🔴 The sign-in's own rule for a mobile (the auth module's `parseIdentifier`, the booking's way): a relative's mobile
 * is composed into E.164 exactly as the account holder's own sign-in number.
 */
const toMobilePhone: RelativeMobileParser = (dialCode, typed) => {
	const identifier = parseIdentifier(typed, dialCode);
	return identifier && 'mobilePhone' in identifier ? identifier.mobilePhone : null;
};

/** The sign-in's own reading of a stored mobile's country code (`readDialCode`): the relative's form shows it split. */
const splitMobilePhone: RelativePhoneSplitter = (stored) => readDialCode(stored);

/** Screen 55's address as its module reads it (the route's closed list, D-W4-20); `null` on the «Προφίλ» tab. */
function relativesAddressOf(address: ProfileAddress): RelativesAddress | null {
	if (address.view === 'relatives') return { view: 'list' };
	if (address.view === 'relative-new') return { view: 'new' };
	if (address.view === 'relative-edit') return { view: 'edit', relativeId: address.relativeId };
	return null;
}

/**
 * The `/profile` page's rows on the web (`19-login/proto-notes.md` §r2): «Βρείτε βοήθεια» and «Νομικά» are the site's
 * pages, «Ρυθμίσεις λογαριασμού» the frame's window of the language and the theme (U-19.1), «Απόρρητο» the consent's.
 * Wave 4.0 (D-W4-51): the same route draws «Οι συγγενείς μου» under it (screen 55), from the address's closed list,
 * with every address its pages lead to resolved here in the page's language (a module knows no route); D-W4-56: a
 * member's row of it leads there.
 */
export function useProfileScreen(data: () => ProfileScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const dialogs = getSiteDialogsOptional();
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const relativesAddress = $derived(relativesAddressOf(data().address));
	const relativesLinks = $derived<RelativesLinks>({
		profile: href(profilePath),
		list: href(relativesPath),
		create: href(newRelativePath),
		relative: (relativeId) => href(relativePath(relativeId))
	});

	return {
		get locale() {
			return locale;
		},
		get address() {
			return data().address;
		},
		/** Screen 55's address, `null` on the «Προφίλ» tab. */
		get relativesAddress() {
			return relativesAddress;
		},
		get relativesLinks() {
			return relativesLinks;
		},
		toMobilePhone,
		splitMobilePhone,
		hrefOf: (row: ProfileMenuRowId) => {
			const path = pages[row];
			return path ? href(path) : null;
		},
		onRow: (row: ProfileMenuRowId) => {
			if (row === 'account-settings') dialogs?.openSettings();
			if (row === 'privacy') dialogs?.openConsent();
		}
	};
}
