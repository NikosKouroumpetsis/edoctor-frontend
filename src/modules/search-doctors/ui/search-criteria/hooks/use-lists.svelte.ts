import { createQuery } from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import {
	doctorSuggestionsQuery,
	locationSuggestionsQuery,
	MIN_SUGGESTION_QUERY_LENGTH,
	popularSpecialtiesQuery,
	readyLocationQuery,
	SUGGESTION_LIMIT_PER_TYPE
} from '$modules/search-doctors/api/marketplace/suggestions';
import { criteriaIcons } from '$modules/search-doctors/config/criteria-icons';
import { whatIcon } from '$modules/search-doctors/lib/criteria-icons';
import { buildAvailabilityDateLabels } from '$modules/search-doctors/lib/availability-dates';
import {
	buildCriteriaLocationOptions,
	buildReadyLocationOptions,
	readyRegionalUnitRows,
	toReadyLocationLookup,
	type CriteriaLocationOption
} from '$modules/search-doctors/lib/criteria-locations';
import { criteriaTranslator } from '$modules/search-doctors/lib/criteria-messages';
import {
	buildCriteriaSuggestionGroups,
	buildPopularSpecialtyOptions,
	type CriteriaSuggestionOption
} from '$modules/search-doctors/lib/criteria-suggestions';
import {
	getSearchCriteriaOptions,
	type SearchCriteriaField,
	type SearchCriteriaOption,
	type WhatSelection,
	type WhereSelection
} from '$modules/search-doctors/lib/search-criteria';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { DEFAULT_DEBOUNCE_MS, useDebouncedValue } from '$shared/lib/debounce';
import { readQueryState, type QueryReadState } from '$shared/lib/query-state';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { IoniconName } from '$shared/ui/icons/ionicon';
import type { OptionRowTileTone } from '$shared/ui/molecules/option-row';
import {
	currentLocationOptionValue,
	getDefaultSuggestionOptions,
	getOptionLabel,
	getOptionSupportingLabel,
	getWhatFallbackSuggestionOptions
} from '../lib/fields';
import type { CriteriaLocationError } from '../types';
import type { CriteriaState } from './use-state.svelte';

/** One drawn row of a list (the `OptionRow` of §6.2 / §6.3), with what its press does. */
export type CriteriaRow = {
	/** Unique in its field (the bar's listbox ids are built from it). */
	key: string;
	label: string;
	supportingLabel?: string;
	icon: IoniconName;
	tileTone: OptionRowTileTone;
	isSelected: boolean;
	isBusy: boolean;
	disabled: boolean;
	/** The typed words to bold (a typeahead row). */
	query?: string;
	/** The application's `search-criteria-option-<value>`. */
	testId: string;
	select: () => void;
};

/** A titled run of rows: `recommended` the list's own header, `group` a typeahead category (12/600 muted). */
export type CriteriaRowGroup = {
	key: string;
	header?: string;
	tone: 'recommended' | 'group';
	rows: CriteriaRow[];
};

/** What a list shows (the application's order of states: waiting ⇒ failed ⇒ nothing found ⇒ the rows). */
export type CriteriaListView =
	| { status: 'loading'; header?: string; testId: string }
	| {
			status: 'error';
			message: string;
			retryLabel: string;
			retry: () => void;
			testId: string;
			retryTestId: string;
	  }
	| { status: 'empty'; message: string; testId: string }
	| {
			status: 'rows';
			groups: CriteriaRowGroup[];
			/** The «Πότε» line that explains, above the rows. */
			note?: string;
			/** The «Κοντά μου» message, under the ready «Πού» rows. */
			notice?: CriteriaLocationErrorView | null;
			testId: string;
	  };

export type CriteriaLocationErrorView = { message: string; error: CriteriaLocationError };

export type CriteriaListsOptions = {
	locale: () => SupportedLocale;
	/** A tapped doctor (the application's: it opens the doctor's page, never commits). */
	onSelectDoctor: (option: CriteriaSuggestionOption) => void;
	/** The «now» of the «Πότε;» dates: the server's (D-118) by default. */
	now?: () => number;
};

type QueryFacts = {
	fetchStatus: 'fetching' | 'paused' | 'idle';
	isError: boolean;
	isPending: boolean;
};

/**
 * Every field a list needs of a read, read EVERY time (a TanStack result notifies only for the fields read, D1
 * lesson 9): its state by `readQueryState` and its data.
 */
function readQuery<T>(query: QueryFacts & { data: T | undefined }): {
	state: QueryReadState;
	data: T | undefined;
} {
	const { fetchStatus, isError, isPending, data } = query;
	return { state: readQueryState({ fetchStatus, isError, isPending }), data };
}

function isWhatSelected(
	option: CriteriaSuggestionOption,
	selection: WhatSelection | null
): boolean {
	if (!selection) return false;
	if (selection.id && option.id) return selection.id === option.id;
	if (selection.slug && option.slug) return selection.slug === option.slug;
	return selection.label === option.label;
}

function isLocationSelected(
	option: CriteriaLocationOption,
	selection: WhereSelection | null
): boolean {
	return selection?.kind === 'location' && selection.slug === option.slug;
}

/**
 * 🔴 The lists of the search, the application's `criteria-what-results` / `criteria-where-results` and the «Πότε»
 * option list (S-01.6, the same reads and states): the reads start the moment a list shows (D-103: at the press,
 * never after a motion), only for the list on screen, the typeahead after 500 ms of quiet from 3 letters. They
 * become rows the phone's cards, its typing page and the bar's panel draw alike (§6.2 / §6.3).
 */
export class CriteriaLists {
	readonly #state: CriteriaState;
	readonly #options: CriteriaListsOptions;
	readonly #whatQuery: { readonly current: string };
	readonly #whereQuery: { readonly current: string };
	readonly #suggestions;
	readonly #popular;
	readonly #locations;
	readonly #ready;

	constructor(state: CriteriaState, options: CriteriaListsOptions) {
		this.#state = state;
		this.#options = options;
		const shows = (field: 'what' | 'where') => () =>
			state.visible && (state.expandedField === field || state.activeSearchPanel === field);
		// The application's list is mounted only while shown: its words are there at once when it shows, later typing
		// waits 500 ms of quiet (`active`, the one shared hook).
		this.#whatQuery = useDebouncedValue(() => state.queries.what.trim(), DEFAULT_DEBOUNCE_MS, {
			active: shows('what')
		});
		this.#whereQuery = useDebouncedValue(() => state.queries.where.trim(), DEFAULT_DEBOUNCE_MS, {
			active: shows('where')
		});

		this.#suggestions = createQuery(() => {
			const query = this.#whatQuery.current;
			return {
				...doctorSuggestionsQuery(query, options.locale()),
				enabled: query.length >= MIN_SUGGESTION_QUERY_LENGTH && shows('what')()
			};
		});
		this.#popular = createQuery(() => ({
			...popularSpecialtiesQuery(options.locale()),
			enabled: shows('what')()
		}));
		this.#locations = createQuery(() => {
			const query = this.#whereQuery.current;
			return {
				...locationSuggestionsQuery(query, options.locale(), state.deviceLocation),
				enabled: query.length >= MIN_SUGGESTION_QUERY_LENGTH && shows('where')()
			};
		});
		// `readyRegionalUnitRows` is a fixed list: one read per row, created once. 🔴 D-103 / U-23.2 (app = web, D2 app
		// review r1 MINOR-2): they are asked the moment the search OPENS — the phone's window and the bar from 744 alike,
		// while «Τι» is still the open card — so «Πού» shows them at once from the cache (the same keys), never after.
		this.#ready = readyRegionalUnitRows.map((row) =>
			createQuery(() => ({
				...readyLocationQuery(toReadyLocationLookup(row)),
				enabled: state.visible
			}))
		);
	}

	get #t() {
		return criteriaTranslator(this.#options.locale());
	}

	get #messageOptions() {
		return { locale: this.#options.locale() };
	}

	#whatRow(option: CriteriaSuggestionOption, query?: string): CriteriaRow {
		const state = this.#state;
		return {
			key: `${option.kind}-${option.value}`,
			label: option.label,
			supportingLabel: option.supportingLabel,
			icon: whatIcon(option.kind, option.label, option.slug),
			tileTone: 'neutral',
			isSelected: isWhatSelected(option, state.criteria.whatSelection),
			isBusy: false,
			disabled: false,
			query,
			testId: `search-criteria-option-${option.value}`,
			select: () =>
				option.kind === 'doctor'
					? this.#options.onSelectDoctor(option)
					: state.commitWhatSelection(option)
		};
	}

	/**
	 * «Τι;»: from 3 typed letters the grouped typeahead (specialties ⇒ services ⇒ doctors) with its waiting, failed
	 * and nothing-found states; else «Προτεινόμενες ειδικότητες» — the popular ones, or the static three when they
	 * cannot be read (never an error: an offer, not a claim about the catalogue).
	 */
	readonly what: CriteriaListView = $derived.by(() => {
		const query = this.#whatQuery.current;
		const suggestions = readQuery(this.#suggestions);
		const popular = readQuery(this.#popular);
		const t = this.#t;
		const options = this.#messageOptions;

		if (query.length >= MIN_SUGGESTION_QUERY_LENGTH) {
			if (suggestions.state === 'waiting') {
				return { status: 'loading', testId: 'search-criteria-what-loading' };
			}
			if (suggestions.state === 'failed' || suggestions.state === 'unavailable') {
				return {
					status: 'error',
					message: m.criteria_what_error({}, options),
					retryLabel: m.criteria_retry({}, options),
					retry: () => void this.#suggestions.refetch(),
					testId: 'search-criteria-what-error',
					retryTestId: 'search-criteria-what-retry'
				};
			}
			const groups = buildCriteriaSuggestionGroups(suggestions.data ?? [], {
				limitPerType: SUGGESTION_LIMIT_PER_TYPE
			});
			if (groups.length === 0) {
				return {
					status: 'empty',
					message: m.criteria_no_results({}, options),
					testId: 'search-criteria-what-empty'
				};
			}
			return {
				status: 'rows',
				testId: 'search-criteria-what-results',
				groups: groups.map((group) => ({
					key: group.kind,
					header: t(group.headerKey),
					tone: 'group',
					rows: group.options.map((option) => this.#whatRow(option, query))
				}))
			};
		}

		const header = m.criteria_recommended_specialties({}, options);
		if (popular.state === 'waiting') {
			return { status: 'loading', header, testId: 'search-criteria-what-loading' };
		}
		const popularOptions =
			popular.state !== 'answered' || !popular.data
				? getWhatFallbackSuggestionOptions(t)
				: buildPopularSpecialtyOptions(popular.data);
		const recommended =
			popularOptions.length > 0 ? popularOptions : getWhatFallbackSuggestionOptions(t);
		// The prototype's line under a recommended specialty (§6.2: the name and one small line): «Ειδικότητα».
		const supportingLabel = t('criteria_option_specialty_supporting');
		return {
			status: 'rows',
			testId: 'search-criteria-what-recommended',
			groups: [
				{
					key: 'recommended',
					header,
					tone: 'recommended',
					rows: recommended.map((option) =>
						this.#whatRow({ ...option, supportingLabel: option.supportingLabel ?? supportingLabel })
					)
				}
			]
		};
	});

	#locationRow(option: CriteriaLocationOption, disabled: boolean, query?: string): CriteriaRow {
		const state = this.#state;
		return {
			key: `location-${option.slug}`,
			label: option.label,
			supportingLabel: option.supportingLabel,
			icon: criteriaIcons.location,
			tileTone: 'neutral',
			isSelected: isLocationSelected(option, state.criteria.whereSelection),
			isBusy: false,
			disabled,
			query,
			testId: `search-criteria-option-${option.slug}`,
			select: () => state.commitWhereLocation(option)
		};
	}

	#staticRow(
		field: SearchCriteriaField,
		option: SearchCriteriaOption,
		extra: Partial<CriteriaRow>
	) {
		const state = this.#state;
		const t = this.#t;
		const row: CriteriaRow = {
			key: `option-${option.value}`,
			label: getOptionLabel(option, t),
			supportingLabel: getOptionSupportingLabel(option, t),
			icon: criteriaIcons.location,
			tileTone: 'neutral',
			isSelected: state.criteria[field] === option.value,
			isBusy: false,
			disabled: false,
			testId: `search-criteria-option-${option.value}`,
			select: () => state.selectOption(field, option),
			...extra
		};
		return row;
	}

	/**
	 * «Πού;»: from 3 typed letters ONLY the server's rows, in its order (S-19.3 / S-23), with the same states; else
	 * «Προτεινόμενες περιοχές» — «Κοντά μου» first (the blue arrow on the blue tile), «Αττική», then each ready
	 * regional unit the server found (S-18.8). While the position is read «Κοντά μου» spins and every row waits.
	 */
	readonly where: CriteriaListView = $derived.by(() => {
		const state = this.#state;
		const query = this.#whereQuery.current;
		const locations = readQuery(this.#locations);
		const readyFacts = this.#ready.map((ready) => readQuery(ready).data ?? null);
		const t = this.#t;
		const options = this.#messageOptions;

		if (query.length >= MIN_SUGGESTION_QUERY_LENGTH) {
			if (locations.state === 'waiting') {
				return { status: 'loading', testId: 'search-criteria-where-loading' };
			}
			if (locations.state === 'failed' || locations.state === 'unavailable') {
				return {
					status: 'error',
					message: m.criteria_where_error({}, options),
					retryLabel: m.criteria_retry({}, options),
					retry: () => void this.#locations.refetch(),
					testId: 'search-criteria-where-error',
					retryTestId: 'search-criteria-where-retry'
				};
			}
			const found = buildCriteriaLocationOptions(locations.data ?? []);
			if (found.length === 0) {
				return {
					status: 'empty',
					message: m.criteria_no_results({}, options),
					testId: 'search-criteria-where-empty'
				};
			}
			return {
				status: 'rows',
				testId: 'search-criteria-where-results',
				groups: [
					{
						key: 'results',
						tone: 'group',
						rows: found.map((option) => this.#locationRow(option, false, query))
					}
				]
			};
		}

		const resolving = state.isResolvingLocation;
		const staticRows = getDefaultSuggestionOptions('where').map((option) => {
			const isCurrentLocation = option.value === currentLocationOptionValue;
			return this.#staticRow('where', option, {
				icon: isCurrentLocation ? criteriaIcons.currentLocation : criteriaIcons.location,
				tileTone: isCurrentLocation ? 'primary' : 'neutral',
				isBusy: resolving && isCurrentLocation,
				disabled: resolving
			});
		});
		const readyRows = buildReadyLocationOptions(readyRegionalUnitRows, readyFacts, t).map(
			(option) => this.#locationRow(option, resolving)
		);
		return {
			status: 'rows',
			testId: 'search-criteria-where-recommended',
			notice: this.locationError,
			groups: [
				{
					key: 'recommended',
					header: m.criteria_recommended_regions({}, options),
					tone: 'recommended',
					rows: [...staticRows, ...readyRows]
				}
			]
		};
	});

	/** The «Κοντά μου» message under the «Πού» rows, or `null` (the application's `CriteriaLocationErrorView`). */
	readonly locationError: CriteriaLocationErrorView | null = $derived.by(() => {
		const error = this.#state.locationError;
		if (!error) return null;
		const options = this.#messageOptions;
		const message =
			error.kind === 'denied'
				? m.criteria_location_denied({}, options)
				: m.criteria_location_unavailable({}, options);
		return { message, error };
	});

	/**
	 * «Πότε;» (U-22): the application's line that explains, then its four rows in its order with the calendar, each
	 * with its dates from today on the platform's clock (the backend's windows); the chosen one ✓, none by default.
	 */
	readonly when: CriteriaListView = $derived.by(() => {
		const locale = this.#options.locale();
		const options = { locale };
		const dates = buildAvailabilityDateLabels(
			(this.#options.now ?? readServerNow)(),
			locale,
			PLATFORM_TIME_ZONE
		);
		const supporting: Record<string, string> = {
			...dates,
			all: m.criteria_when_all_days({}, options)
		};
		return {
			status: 'rows',
			testId: 'search-criteria-when-options',
			note: m.criteria_when_note({}, options),
			groups: [
				{
					key: 'when',
					tone: 'group',
					rows: getSearchCriteriaOptions('availability', '').map((option) =>
						this.#staticRow('availability', option, {
							icon: criteriaIcons.availability,
							supportingLabel: supporting[option.value]
						})
					)
				}
			]
		};
	});

	/** A field's list. */
	viewOf(field: SearchCriteriaField): CriteriaListView {
		if (field === 'what') return this.what;
		if (field === 'where') return this.where;
		return this.when;
	}

	/** A field's rows in their order (the bar's listbox ids). */
	rowsOf(field: SearchCriteriaField): CriteriaRow[] {
		const view = this.viewOf(field);
		return view.status === 'rows' ? view.groups.flatMap((group) => group.rows) : [];
	}
}
