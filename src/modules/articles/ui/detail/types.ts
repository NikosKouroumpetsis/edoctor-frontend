import type { Snippet } from 'svelte';
import type { ResolvedPathname } from '$app/types';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { ArticlePublicView } from '$modules/articles/api';

/** What the article's page (wave 1.5, screen 6, U-57.4) needs from its route and screen. */
export type ArticleDetailProps = {
	article: ArticlePublicView;
	/** The list's first articles for «Περισσότερα άρθρα»; `null` when that read failed (no row). */
	related: ArticlePublicView[] | null;
	locale: SupportedLocale;
	/** The list (the breadcrumbs' first step, the phone's «‹») and the list of the article's kind (the second). */
	listHref: ResolvedPathname;
	kindHref: ResolvedPathname;
	articleHref: (slug: string) => ResolvedPathname;
	/** A doctor's profile by its slug (the doctor module's address, composed by the screen). */
	doctorHref: (slug: string) => ResolvedPathname;
	/** A path of this site as the page links it (its language), for the links inside the text. */
	internalHref: (path: string) => string;
	/** After a ToC entry is followed (the screen writes the anchor into the address). */
	onAnchor?: (id: string) => void;
	/** The `<head>`: the article's absolute address and its languages (the site's public origin, U-28.4). */
	canonicalUrl: string;
	alternateUrls: Record<SupportedLocale, string>;
	/** U-78: «Ήταν χρήσιμο;», last before «Περισσότερα άρθρα» (the helpful module's, composed by the screen). */
	helpful?: Snippet;
};
