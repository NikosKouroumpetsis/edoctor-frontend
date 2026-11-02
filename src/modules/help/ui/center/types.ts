import type { ResolvedPathname } from '$app/types';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { HelpFaqSource } from '$modules/help/types';

/** The help centre's address with its search (`?q=`), its topic (`?topic=`) and an anchor, in the page's language. */
export type HelpHref = (state: {
	q?: string | null;
	topic?: string | null;
	hash?: string | null;
}) => ResolvedPathname;

/** What the help centre (wave 1.5, screen 8, U-60) needs from its route and screen. */
export type HelpCenterProps = {
	faq: HelpFaqSource;
	locale: SupportedLocale;
	helpHref: HelpHref;
	/** Below 744, the bar's «‹» (the home). */
	backHref: string;
	/** A path of this site as the page links it (its language), for the links inside the answers. */
	internalHref: (path: string) => string;
	supportEmail: string;
	/** «Δοκιμάστε ξανά» of a failed FAQ: the route's read again. */
	onRetry: () => void;
	canonicalUrl: string;
	alternateUrls: Record<SupportedLocale, string>;
};
