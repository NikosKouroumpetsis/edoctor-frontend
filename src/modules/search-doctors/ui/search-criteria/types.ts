import type { SearchCriteriaField } from '$modules/search-doctors/lib/search-criteria';

/** The words the user typed per field (what a list searches by), the application's `CriteriaQueryState`. */
export type CriteriaQueryState = Record<SearchCriteriaField, string>;

/**
 * Under the «Πού» rows when «Κοντά μου» found no position (the application's `CriteriaLocationError`): `denied` the
 * refusal (`canOpenSettings` as the application derives it; a web page cannot open the browser's settings, so the
 * web's message offers no action), `unavailable` no position in time.
 */
export type CriteriaLocationError =
	| { kind: 'denied'; canOpenSettings: boolean }
	| { kind: 'unavailable' };

/** The fields that open the full typing page («Τι», «Πού»), the application's `SearchPanelField`. */
export type SearchPanelField = Extract<SearchCriteriaField, 'what' | 'where'>;

/**
 * Where the search is open (web): `sheet` the phone's window of cards (< 744), `bar` the big bar's panel (≥ 744).
 * One state for both, so a resize never loses what was chosen.
 */
export type CriteriaSurface = 'sheet' | 'bar';
