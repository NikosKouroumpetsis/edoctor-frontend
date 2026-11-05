import { createContext } from '$shared/lib/headless';

/**
 * The frame's two windows a page may ask for (U-82.1: the phone's `/profile` opens them, as its rows do in the
 * application), one per page tree (context, SSR-safe): «Ρυθμίσεις» (the language and the theme, U-19.1) and the
 * consent's «Διαχείριση προτιμήσεων». The frame draws them, the page only asks: neither imports the other.
 */
export class SiteDialogs {
	settingsOpen = $state(false);
	consentRequested = $state(false);

	openSettings() {
		this.settingsOpen = true;
	}

	openConsent() {
		this.consentRequested = true;
	}
}

export const [getSiteDialogs, setSiteDialogs, getSiteDialogsOptional] =
	createContext<SiteDialogs>('SiteDialogs');
