import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { IoniconName } from '$shared/ui/icons/ionicon';
import type { StatusArtName } from '$shared/ui/organisms/status-page';

/** One of the status page's ways on: its words and its address. */
export type StatusLink = { label: string; href: string };

/** A button of the status page: a link, or the retry (`retry: true`, the caller's press). */
export type StatusAction = { label: string; href?: string; retry?: boolean };

/** What the site's 404 or error page says (U-61.1): every word in the page's language, the ways on included. */
export type StatusPageContent = {
	/** Whether the page is the 404 (a missing page), else a failure (with its retry). */
	missing: boolean;
	oops: string;
	glyph: IoniconName;
	art: StatusArtName;
	title: string;
	text: string;
	/** «Κωδικός σφάλματος: N» when the status is an error's (400–599), else empty. */
	codeLabel: string;
	/** From 744: the buttons (the error's «Δοκιμάστε ξανά» + «Αρχική»; none on the 404). */
	actions: StatusAction[];
	/** Below 744: the dark button and the text button (the application's `StatusScreen`). */
	phoneActions: StatusAction[];
	linksTitle: string;
	links: StatusLink[];
	/** The tab's title (never indexed). */
	documentTitle: string;
};

/** The error code's line for a status of 400–599, else empty. */
export function statusCodeLabel(status: number, locale: SupportedLocale): string {
	return Number.isInteger(status) && status >= 400 && status <= 599
		? m.status_code({ code: String(status) }, { locale })
		: '';
}

/**
 * 🔴 U-61.1 (the prototype 09, `?v=404|error`): the site's status page. A 404: «Δεν βρίσκουμε τη σελίδα που
 * ψάχνετε.», «Ο σύνδεσμος μπορεί να είναι παλιός ή λανθασμένος.», «Ίσως σας βοηθήσουν:» Αρχική · Αναζήτηση γιατρών ·
 * Άρθρα υγείας · Κέντρο βοήθειας, the map pin; below 744 «Αναζήτηση γιατρών» + «Κέντρο βοήθειας». Any other status:
 * «Κάτι πήγε στραβά», «Δεν φταίτε εσείς. Δοκιμάστε ξανά σε λίγο.», «Δοκιμάστε ξανά» (U-61.2 Ε2) + «Αρχική», the plug.
 */
export function buildStatusPage(
	status: number,
	locale: SupportedLocale,
	href: (path: string) => string
): StatusPageContent {
	const options = { locale };
	const missing = status === 404;
	const home = { label: m.status_home({}, options), href: href('/') };
	const search = { label: m.status_search({}, options), href: href('/doctors') };
	const help = { label: m.nav_help({}, options), href: href('/help') };
	const retry = { label: m.status_retry({}, options), retry: true };
	const base = {
		oops: m.status_oops({}, options),
		codeLabel: statusCodeLabel(status, locale),
		linksTitle: m.status_links_title({}, options)
	};
	if (missing) {
		return {
			...base,
			missing,
			glyph: 'compass-outline',
			art: 'pin',
			title: m.status_not_found_title({}, options),
			text: m.status_not_found_body({}, options),
			actions: [],
			phoneActions: [search, help],
			links: [home, search, { label: m.nav_articles({}, options), href: href('/articles') }, help],
			documentTitle: m.status_not_found_tab({}, options)
		};
	}
	return {
		...base,
		missing,
		glyph: 'alert-circle',
		art: 'plug',
		title: m.status_error_title({}, options),
		text: m.status_error_body({}, options),
		actions: [retry, home],
		phoneActions: [retry, home],
		links: [],
		documentTitle: m.status_error_tab({}, options)
	};
}
