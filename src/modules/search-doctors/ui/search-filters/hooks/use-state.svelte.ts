import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { SearchDoctorsFilterFacets } from '$modules/search-doctors/api/marketplace/facets-adapter';
import {
	filterFacetsQuery,
	searchResultsCountQuery
} from '$modules/search-doctors/api/marketplace/search-results';
import type {
	MarketplaceGender,
	MarketplacePaymentOption,
	MarketplaceSortBy
} from '$modules/search-doctors/api/marketplace/types';
import {
	defaultSearchDoctorsCriteria,
	type SearchDoctorsCriteria
} from '$modules/search-doctors/lib/search-criteria';
import {
	defaultSearchDoctorsFilters,
	isAnySearchDoctorsFilterActive,
	type SearchDoctorsFilters
} from '$modules/search-doctors/lib/search-filters';
import { buildSearchDoctorsScope } from '$modules/search-doctors/lib/search-query';
import { useDebouncedValue } from '$shared/lib/debounce';
import { readQueryState } from '$shared/lib/query-state';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The live count's quiet window (the application's `COUNT_DEBOUNCE_MS`): past a flurry of taps, still live. */
export const COUNT_DEBOUNCE_MS = 350;

export type FiltersStateOptions = {
	/**
	 * The search's criteria (the very ones the list searched by: «Κοντά μου» with its position), or `null` while
	 * «Κοντά μου» still has none — then the window reads nothing (never the default Αττική, S-32.2).
	 */
	criteria: () => SearchDoctorsCriteria | null;
	/** The applied filters, seeded into the draft at each open (the application's `initialFilters`). */
	initialFilters: () => SearchDoctorsFilters;
	locale: () => SupportedLocale;
	/** «Εμφάνιση N γιατρών»: the draft becomes the page's filters. */
	onSubmit: (filters: SearchDoctorsFilters) => void;
};

/**
 * 🔴 The application's `useFilterModalState` (S-01.6, the same logic): the window's draft, seeded at each open; the
 * facets and the pricing gate scoped by the CRITERIA only; the live count of criteria + the draft after 350 ms of
 * quiet (S-32.10: the number is what the list will show, the same read as the list's first page). Both reads run
 * ONLY while the window is open (D-103: they start at the press that opens it, never after its motion).
 */
export class FiltersState {
	/** The window is open (the application's `visible`). */
	open = $state(false);
	draft = $state.raw<SearchDoctorsFilters>(defaultSearchDoctorsFilters);

	readonly #options: FiltersStateOptions;
	readonly #facets;
	readonly #count;

	constructor(options: FiltersStateOptions) {
		this.#options = options;
		const queryClient = useQueryClient();
		const debounced = useDebouncedValue(() => this.draft, COUNT_DEBOUNCE_MS, {
			active: () => this.open
		});
		this.#facets = createQuery(() => {
			const criteria = options.criteria();
			return {
				...filterFacetsQuery(
					queryClient,
					buildSearchDoctorsScope(
						criteria ?? defaultSearchDoctorsCriteria,
						defaultSearchDoctorsFilters
					),
					options.locale()
				),
				enabled: this.open && criteria !== null
			};
		});
		this.#count = createQuery(() => {
			const criteria = options.criteria();
			return {
				...searchResultsCountQuery(
					queryClient,
					buildSearchDoctorsScope(criteria ?? defaultSearchDoctorsCriteria, debounced.current),
					options.locale()
				),
				enabled: this.open && criteria !== null
			};
		});
	}

	/** Opens the window on the applied filters (a draft of its own until «Εμφάνιση»). */
	show = (): void => {
		this.draft = this.#options.initialFilters();
		this.open = true;
	};

	/** The «×», Escape, the backdrop: the draft is dropped, the page keeps its filters. */
	close = (): void => {
		this.open = false;
	};

	/** The facets as facts, or none while they load (or failed: the window still filters, without counts). */
	get facets(): SearchDoctorsFilterFacets | undefined {
		return this.#options.criteria() === null ? undefined : this.#facets.data;
	}

	/** The facets are not answered yet (every field read, D1 lesson 9). */
	get isFacetsLoading(): boolean {
		const { fetchStatus, isError, isPending } = this.#facets;
		return readQueryState({ fetchStatus, isError, isPending }) !== 'answered';
	}

	/** The count the button states, `null` while unknown (an older backend, or not read yet). */
	get total(): number | null {
		if (this.#options.criteria() === null) return null;
		return this.#count.data?.total ?? null;
	}

	get totalIsLowerBound(): boolean {
		if (this.#options.criteria() === null) return false;
		return this.#count.data?.totalIsLowerBound ?? false;
	}

	/** A count is on its way (the last one stays shown meanwhile, `keepPreviousData`). */
	get isCountLoading(): boolean {
		return this.#count.isFetching;
	}

	get hasActiveFilters(): boolean {
		return isAnySearchDoctorsFilterActive(this.draft);
	}

	/** «Απόσταση» is a choice only when «Πού» is the device's point. */
	get hasGeoLocation(): boolean {
		const criteria = this.#options.criteria();
		return criteria !== null && buildSearchDoctorsScope(criteria).where.kind === 'geo';
	}

	/** The specialty's services are offered only for a chosen specialty. */
	get servicesAvailable(): boolean {
		return this.#options.criteria()?.whatSelection?.kind === 'professional';
	}

	get pricingVisible(): boolean {
		return Boolean(this.facets?.pricingVisible);
	}

	get priceRange(): { min: number; max: number } | null {
		return this.facets?.priceRange ?? null;
	}

	setSort = (value: string): void => {
		this.draft = { ...this.draft, sortBy: value as MarketplaceSortBy };
	};

	setGender = (value: string): void => {
		this.draft = { ...this.draft, gender: value as MarketplaceGender };
	};

	togglePayment = (value: MarketplacePaymentOption): void => {
		const current = this.draft.paymentOptions;
		this.draft = {
			...this.draft,
			paymentOptions: current.includes(value)
				? current.filter((item) => item !== value)
				: [...current, value]
		};
	};

	/** One communication language at most: a second press on it clears it. */
	toggleLanguage = (code: string): void => {
		this.draft = {
			...this.draft,
			speakLanguageCode: this.draft.speakLanguageCode === code ? null : code
		};
	};

	toggleService = (slug: string): void => {
		const current = this.draft.serviceSlugs;
		this.draft = {
			...this.draft,
			serviceSlugs: current.includes(slug)
				? current.filter((item) => item !== slug)
				: [...current, slug]
		};
	};

	toggleDisabilityAccess = (): void => {
		this.draft = { ...this.draft, disabilityAccess: !this.draft.disabilityAccess };
	};

	toggleParking = (): void => {
		this.draft = { ...this.draft, parking: !this.draft.parking };
	};

	/**
	 * A price range; the whole range (the floor AND the ceiling) clears the price filter, so «everything» is never an
	 * active filter. Only reachable while the price section shows (the facets' pricing gate and range).
	 */
	setPriceRange = (next: [number, number]): void => {
		const range = this.priceRange;
		if (!range) return;
		const [min, max] = next;
		this.draft = {
			...this.draft,
			priceMin: min <= range.min ? null : min,
			priceMax: max >= range.max ? null : max
		};
	};

	/** «Εκκαθάριση όλων»: every filter back to none (the window stays open). */
	clearAll = (): void => {
		this.draft = defaultSearchDoctorsFilters;
	};

	/** «Εμφάνιση N γιατρών». */
	apply = (): void => {
		this.open = false;
		this.#options.onSubmit(this.draft);
	};
}
