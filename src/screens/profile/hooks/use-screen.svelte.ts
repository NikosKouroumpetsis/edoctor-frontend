import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSiteDialogsOptional } from '$shared/state/site-dialogs';
import type { ProfileMenuRowId } from '$modules/profile/types';

const pages: Partial<Record<ProfileMenuRowId, string>> = { help: '/help', legal: '/legal' };

/**
 * The `/profile` page's rows on the web (`19-login/proto-notes.md` §r2): «Βρείτε βοήθεια» and «Νομικά» are the site's
 * pages, «Ρυθμίσεις λογαριασμού» the frame's window of the language and the theme (U-19.1), «Απόρρητο» the consent's.
 */
export function useProfileScreen() {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const dialogs = getSiteDialogsOptional();

	return {
		get locale() {
			return locale;
		},
		hrefOf: (row: ProfileMenuRowId) => {
			const path = pages[row];
			return path ? resolve(localizeHref(path, { locale }) as Pathname) : null;
		},
		onRow: (row: ProfileMenuRowId) => {
			if (row === 'account-settings') dialogs?.openSettings();
			if (row === 'privacy') dialogs?.openConsent();
		}
	};
}
