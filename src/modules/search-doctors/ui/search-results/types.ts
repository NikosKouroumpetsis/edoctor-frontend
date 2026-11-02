import type { Snippet } from 'svelte';
import type { ResultsPageData } from '$modules/search-doctors/api/results';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The results page's props (the screen passes the route's data and the frame's legal line). */
export type SearchResultsProps = {
	data: ResultsPageData;
	/** The thin legal line at the list's end (the frame's, composed by the screen: §7.2, no footer). */
	legal?: Snippet;
};

/**
 * U-28.2: from 1128 the map beside the list (`split`, 2/3 + 1/3), over the whole stage (`expanded`) or out of the
 * layout (`hidden`).
 */
export type DesktopMap = 'split' | 'expanded' | 'hidden';

/** The locale options every private unit of the page reads its words with. */
export type ResultsMessageOptions = { locale: SupportedLocale };
