import type { LocalizedTerm } from './sections';

/**
 * The terms a submitted search falls back to for an empty field (the application's `search-defaults`): the query
 * builder resolves them to ids/slugs, the results' summary shows the same words, so the two never drift apart. The
 * page's language picks the form through `termFor` (the application's `resolveLocalizedTerm`, the same rule).
 */

/** The empty «Τι;»: the general practitioner. */
export const DEFAULT_SPECIALTY_TERM: LocalizedTerm = {
	el: 'Γενικός Ιατρός',
	en: 'General Practitioner'
};

/** The empty (or free-words) «Πού;»: Attica (S-01.3). */
export const DEFAULT_LOCATION_TERM: LocalizedTerm = { el: 'Αττική', en: 'Attica' };
