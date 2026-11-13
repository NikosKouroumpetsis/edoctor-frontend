import type { Pathname } from '$app/types';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { deLocalizeHref, localizeHref } from '$paraglide/runtime';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getSiteDialogsOptional } from '$shared/state/site-dialogs';
import type { RelativePhoneSplitter } from '$modules/appointments/lib/relatives';
import type { RelativeMobileParser } from '$modules/appointments/ui/relative-form';
import type { RelativesAddress, RelativesLinks } from '$modules/appointments/ui/relatives';
import { parseIdentifier, readDialCode } from '$modules/auth/lib/identifier';
import { DOCTOR_ONBOARDING_PATH } from '$modules/doctor-onboarding/lib/steps';
import { notificationsPath } from '$modules/notifications/lib/paths';
import {
	accountSettingsPath,
	newRelativePath,
	profilePath,
	relativePath,
	relativesPath,
	settingsPagePath,
	settingsSectionPath,
	type ProfileAddress
} from '$modules/profile/lib/paths';
import type { ProfileMenuRowId } from '$modules/profile/types';
import type { PrivacyLinks } from '$modules/profile/ui/privacy';
import type { SettingsLinks } from '$modules/profile/ui/settings';
import { legalPath } from '$modules/shell/lib/legal';
import type { ProfileScreenData } from '../types';

const pages: Partial<Record<ProfileMenuRowId, string>> = {
	relatives: relativesPath,
	help: '/help',
	// 🔴 D-W45-29 (wave 4.5, screen 62): «Απόρρητο» is a page for everyone — a guest's too — no window any more.
	privacy: settingsSectionPath('privacy'),
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
 * pages, «Ρυθμίσεις λογαριασμού» the frame's window of the language and the theme (U-19.1), «Απόρρητο» its own page
 * (screen 62, D-W45-29: for a guest too — it was the consent's window).
 * Wave 4.0 (D-W4-51): the same route draws «Οι συγγενείς μου» under it (screen 55), from the address's closed list,
 * with every address its pages lead to resolved here in the page's language (a module knows no route); D-W4-56: a
 * member's row of it leads there. Wave 4.5 (D-W45-01, D-W45-05): the same route draws «Ρυθμίσεις λογαριασμού» (screen
 * 57) and its sections; a MEMBER's row «Ρυθμίσεις λογαριασμού» is a link to it, a guest's still opens the frame's window.
 */
export function useProfileScreen(data: () => ProfileScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const dialogs = getSiteDialogsOptional();
	const session = getSessionOptional();
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const relativesAddress = $derived(relativesAddressOf(data().address));
	const relativesLinks = $derived<RelativesLinks>({
		profile: href(profilePath),
		list: href(relativesPath),
		create: href(newRelativePath),
		relative: (relativeId) => href(relativePath(relativeId))
	});
	const settingsLinks = $derived<SettingsLinks>({
		profile: href(profilePath),
		list: href(accountSettingsPath),
		section: (section) => href(settingsSectionPath(section)),
		page: (settingsPage) => href(settingsPagePath(settingsPage))
	});
	// 🔴 D-W45-27: «Τα προσωπικά σας δεδομένα» opens the Privacy policy at the section of the rights only if the legal
	// pages gave that section an anchor. They do not: an anchor is a heading of the CMS text (`richTextToc`), and «ΤΑ
	// ΔΙΚΑΙΩΜΑΤΑ ΣΑΣ» is a plain line of it — so the policy opens at its start (the application does the same).
	const privacyLinks = $derived<PrivacyLinks>({
		rights: href(legalPath('privacy-policy')),
		policy: href(legalPath('privacy-policy')),
		tools: href(settingsPagePath('tools')),
		deletion: href(settingsPagePath('deletion'))
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
		get settingsLinks() {
			return settingsLinks;
		},
		/** Screen 62: every address «Απόρρητο» leads to. */
		get privacyLinks() {
			return privacyLinks;
		},
		/** The home page: where the end of «Διαγραφή λογαριασμού» leads (D-W45-30). */
		get homeHref() {
			return href('/');
		},
		/** «Εργαλεία τρίτων και cookies» kept the choice: back to «Απόρρητο». */
		openPrivacy: () => goto(href(settingsSectionPath('privacy'))),
		/** A deletion code is out: its step (🔴 U-65.6: the path alone — nothing of the code or the person in it). */
		openDeletionCode: () => goto(href(settingsPagePath('deletion-code'))),
		/** The code step with no code out (a reload, a link): step 1 takes its place in the history. */
		backToDeletion: () => goto(href(settingsPagePath('deletion')), { replaceState: true }),
		/** D-W45-30: a deletion address without a session — the «Προφίλ» takes its place in the history. */
		leaveToProfile: () => goto(href(profilePath), { replaceState: true }),
		/**
		 * This same page in a language — its path alone, never a query or a fragment (U-65.6) — the way of the frame's
		 * language switch (`samePageIn`): where a choice of language goes (screen 61).
		 */
		languageHref: (next: SupportedLocale) =>
			resolve(localizeHref(deLocalizeHref(page.url.pathname), { locale: next }) as Pathname),
		toMobilePhone,
		splitMobilePhone,
		/** «Είστε γιατρός;» of the «Προφίλ» (D-W45-20): the doctor's sign-up, where the menu's same entry leads. */
		get doctorHref() {
			return href(DOCTOR_ONBOARDING_PATH);
		},
		/** The bell of the «Προφίλ» (screen 63, D-W45-49): «Ειδοποιήσεις», the list. */
		get notificationsHref() {
			return href(notificationsPath);
		},
		hrefOf: (row: ProfileMenuRowId) => {
			// 🔴 D-W45-05: a member's «Ρυθμίσεις λογαριασμού» is the page; a guest's stays the frame's small window (`onRow`).
			if (row === 'account-settings') return session?.isMember ? href(accountSettingsPath) : null;
			const path = pages[row];
			return path ? href(path) : null;
		},
		onRow: (row: ProfileMenuRowId) => {
			if (row === 'account-settings') dialogs?.openSettings();
		}
	};
}
