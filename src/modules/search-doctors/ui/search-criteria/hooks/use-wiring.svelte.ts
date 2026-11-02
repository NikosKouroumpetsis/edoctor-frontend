import type { Pathname } from '$app/types';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { m } from '$paraglide/messages.js';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { SearchDock } from '$shared/state/search-dock';
import type { CriteriaSuggestionOption } from '$modules/search-doctors/lib/criteria-suggestions';
import type { SearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';
import { useCriteriaBar, type CriteriaBar } from './use-bar.svelte';
import { CriteriaLists } from './use-lists.svelte';
import { CriteriaState } from './use-state.svelte';

export type CriteriaWiringOptions = {
	locale: () => SupportedLocale;
	/** The frame's side of the search (its pill and the drop), when the page sits in the frame. */
	dock: SearchDock | undefined;
	/** A search, the window or the bar already closed and lifted: the page goes to its results. */
	onSearch: (criteria: SearchDoctorsCriteria) => void;
	/** The criteria each open seeds (the results page's address); the home keeps what it gathered. */
	initialCriteria?: () => SearchDoctorsCriteria;
};

/** The search's ONE state, its reads and the big bar's segments, as every page wires them. */
export type CriteriaWiring = { search: CriteriaState; lists: CriteriaLists; bar: CriteriaBar };

/**
 * 🔗 MINOR-6 (U-29): the search «Τι / Πού / Πότε» wired for a page (the home, the results): ONE `CriteriaState` for
 * the phone's window and the bar from 744, its `CriteriaLists` and `useCriteriaBar`. A search closes the window,
 * lifts the bar dropped from the top bar's pill, then `onSearch`; a doctor row opens the doctor's page (one without
 * a slug does nothing, the application's). Call it while the page is set up.
 */
export function useCriteriaWiring(options: CriteriaWiringOptions): CriteriaWiring {
	const { dock, onSearch, initialCriteria } = options;
	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: options.locale() }) as Pathname);

	const search: CriteriaState = new CriteriaState({
		onSubmit: (criteria) => {
			search.close();
			dock?.lift();
			onSearch(criteria);
		},
		currentLocationLabel: () =>
			m.criteria_option_current_location({}, { locale: options.locale() }),
		...(initialCriteria ? { initialCriteria } : {})
	});

	function openDoctor(option: CriteriaSuggestionOption) {
		if (!option.slug) return;
		search.close();
		dock?.lift();
		void goto(localizedHref(`/doctors/${encodeURIComponent(option.slug)}`));
	}

	const lists = new CriteriaLists(search, { locale: options.locale, onSelectDoctor: openDoctor });
	const bar = useCriteriaBar(search, lists, options.locale);
	return { search, lists, bar };
}
