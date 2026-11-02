import { createQueries, createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type { Pathname, ResolvedPathname } from '$app/types';
import { pushState, replaceState } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { readQueryState } from '$shared/lib/query-state';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	DOCTOR_AVAILABILITY_WINDOW_DAYS,
	doctorAvailabilitySlotsQuery
} from '$modules/doctor/api/availability';
import { doctorOfficeQuery } from '$modules/doctor/api/office';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import { doctorReviewsQuery } from '$modules/doctor/api/reviews';
import {
	buildDoctorAvailabilityModalContent,
	buildDoctorAvailabilitySection,
	buildDoctorBookingContent,
	buildDoctorDetailContent,
	buildDoctorOfficeView,
	buildDoctorReviewsModalContent,
	buildDoctorServicesModalContent,
	buildDoctorSimilarSearch,
	doctorDetailsPath,
	doctorProfilePath,
	hasAnyBookableSlot,
	isDoctorDetailSection,
	isDoctorProfileOffice,
	readDoctorDetailHints,
	resolveDoctorActiveOfficeId,
	resolveDoctorAvailabilityServiceId,
	type DoctorAvailabilityByOffice,
	type DoctorAvailabilityReadState,
	type DoctorDetailHints,
	type DoctorDetailSection,
	type DoctorSelectedSlot,
	type DoctorSimilarArea,
	type DoctorSimilarSearch
} from '$modules/doctor/lib/detail';
import type { DoctorSimilarAreaQuery } from '../types';

/** A window of the page: its section and the hints it opened with; `null` none. */
export type DoctorDetailWindow = { section: DoctorDetailSection; hints: DoctorDetailHints } | null;

export type DoctorDetailStateOptions = {
	profile: () => DoctorProfile;
	locale: () => SupportedLocale;
	/** The server's «now» (D-118), the platform's clock of every «Σήμερα / Αύριο». */
	now: () => number;
	/** The details route's section (`/doctors/<slug>/details/<section>`), `null` on the profile's own route. */
	routeSection: () => DoctorDetailSection | null;
	/** A path in the page's language (`localizeHref`), not yet resolved: the state resolves it where it goes. */
	localize: (path: string) => string;
	/**
	 * 🔴 U-37.2 (MAJOR-2 of r1): the search «ίδια ειδικότητα + περιοχή» — the screen's (a module never imports
	 * another): the area only as the catalogue's resolved location (`area`), never as free words.
	 */
	similarHref: (search: DoctorSimilarSearch, area: DoctorSimilarArea | null) => ResolvedPathname;
	/** The read that turns the active office's city into the catalogue's area (the screen's, `resolveLocationSlug`). */
	similarAreaQuery: DoctorSimilarAreaQuery;
};

/**
 * The profile's page state (the application's `useDoctorDetailScreen` on the web): the reads of the browser — every
 * office's 4-week window at once (U-37.1, D-103), the active office's own facts when it is not the main one (U-39.1,
 * once, cached), the whole reviews list while its window is open — and the reader's choices: the active office, the
 * service, the chosen time, the open window. The profile's facts are the route's load, never copied here.
 */
export class DoctorDetailState {
	/** The office the reader picked with a pill (U-39.2); `null` lets the nearest time choose (U-39.1). */
	chosenOfficeId = $state<string | null>(null);
	/** The service the reader picked in the card's «ΥΠΗΡΕΣΙΑ»; `null` the primary one. */
	chosenServiceId = $state<string | null>(null);
	/** The time confirmed in the window «Διαθεσιμότητα» (U-40.3). */
	selectedSlot = $state<DoctorSelectedSlot | null>(null);
	/** The web's share window (desktop; a phone takes the system's share, U-34.2). */
	shareOpen = $state(false);

	readonly #options: DoctorDetailStateOptions;
	readonly #slots;
	readonly #office;
	readonly #reviews;
	readonly #similarArea;

	constructor(options: DoctorDetailStateOptions) {
		this.#options = options;
		// 🔴 U-37.1 / D-103: every office's window of 28 days, asked the moment the page lives (never after a motion),
		// for the service the page books; one read per office (TanStack's cache: the window reads the same keys).
		this.#slots = createQueries(() => {
			const profile = options.profile();
			const doctorId = profile.doctorId;
			const serviceId = this.serviceId;
			return {
				queries: (profile.offices ?? []).map((office) => ({
					...doctorAvailabilitySlotsQuery({
						doctorId: doctorId ?? '',
						officeId: office.officeId,
						doctorServiceId: serviceId ?? '',
						days: DOCTOR_AVAILABILITY_WINDOW_DAYS
					}),
					enabled: browser && Boolean(doctorId) && Boolean(serviceId)
				}))
			};
		});
		// 🔴 U-39.1: the active office's facts — the profile's own office came with the profile (D-103: nothing more
		// is asked for it); another office is asked ONCE, when it becomes active, and kept.
		this.#office = createQuery(() => {
			const profile = options.profile();
			const officeId = this.activeOfficeId ?? '';
			return {
				...doctorOfficeQuery(profile.doctorId ?? '', officeId, options.locale()),
				enabled:
					browser &&
					Boolean(profile.doctorId) &&
					Boolean(officeId) &&
					!isDoctorProfileOffice(profile, officeId)
			};
		});
		// D-103: the whole list of reviews at the window's opening (its motion runs beside the read).
		this.#reviews = createQuery(() => ({
			...doctorReviewsQuery(options.profile().doctorSlug, options.locale()),
			enabled: browser && this.window?.section === 'reviews'
		}));
		// 🔴 U-37.2 / D-103: the active office's city as the catalogue's area, asked in the browser the moment cases 1
		// and 2 show («Δείτε παρόμοιους» is on screen) — never before, never for a doctor with times.
		this.#similarArea = createQuery(() => {
			const city = this.similarSearch.city ?? '';
			return {
				...options.similarAreaQuery(city),
				enabled: browser && Boolean(city) && this.#showsSimilar
			};
		});
	}

	get profile(): DoctorProfile {
		return this.#options.profile();
	}

	get locale(): SupportedLocale {
		return this.#options.locale();
	}

	/** The service the slots are asked for: the chosen one, a link's `service`, else the primary one. */
	get serviceId(): string | undefined {
		return resolveDoctorAvailabilityServiceId(
			this.profile.services,
			this.chosenServiceId ?? this.#pageHints.service
		);
	}

	/** Every office's window that answered, by office. */
	readonly availabilityByOffice: DoctorAvailabilityByOffice = $derived.by(() => {
		const byOffice: DoctorAvailabilityByOffice = {};
		const offices = this.profile.offices ?? [];
		this.#slots.forEach((query, index) => {
			const office = offices[index];
			if (office && query.data) byOffice[office.officeId] = query.data;
		});
		return byOffice;
	});

	/**
	 * Where the windows stand, every read's every field read (a TanStack result tells only the fields read): `idle`
	 * when nothing is asked (no service, no id), `waiting`, `failed` (a failed or paused read), else `answered`.
	 */
	readonly availabilityState: DoctorAvailabilityReadState = $derived.by(() => {
		const states = this.#slots.map((query) => readQueryState(query));
		if (!this.profile.doctorId || !this.serviceId || states.length === 0) return 'idle';
		// The server's page asks no time (they are the browser's, D-103): it waits, never claims «no time».
		if (!browser) return 'waiting';
		if (states.some((state) => state === 'waiting')) return 'waiting';
		if (states.some((state) => state === 'failed' || state === 'unavailable')) return 'failed';
		return 'answered';
	});

	/** «Δοκιμάστε ξανά» of the times: asks again ONLY the windows that failed (lesson 7). */
	retryAvailability = () => {
		for (const query of this.#slots) {
			if (query.isError || query.fetchStatus === 'paused') void query.refetch();
		}
	};

	/** The window open now: the page's own state (shallow routing), else the details route's section. */
	get window(): DoctorDetailWindow {
		const state = page.state?.doctorDetails;
		if (state !== undefined) {
			if (!state || !isDoctorDetailSection(state.section)) return null;
			const { section, focus, office, date, service } = state;
			return { section, hints: { focus, office, date, service } };
		}
		const section = this.#options.routeSection();
		return section ? { section, hints: readDoctorDetailHints(page.url.searchParams) } : null;
	}

	/** The profile route's own hints (`?office=…`) and the open window's. */
	get #pageHints(): DoctorDetailHints {
		return this.window?.hints ?? readDoctorDetailHints(page.url.searchParams);
	}

	/**
	 * 🔴 U-39.1 (app = web): the page's ONE active office — the reader's pill, a link's `office`, else the office with
	 * the nearest time, else the profile's own.
	 */
	get activeOfficeId(): string | undefined {
		return resolveDoctorActiveOfficeId({
			availabilityByOffice: this.availabilityByOffice,
			offices: this.profile.offices,
			requestedOfficeId: this.chosenOfficeId ?? this.#pageHints.office
		});
	}

	/** U-39.2: the pill — the ONE way to change the active office, the same everywhere. */
	chooseOffice = (officeId: string) => {
		this.chosenOfficeId = officeId;
	};

	chooseService = (serviceId: string) => {
		this.chosenServiceId = serviceId;
		this.selectedSlot = null;
	};

	/**
	 * U-39.1 (the application's `buildDoctorOfficeView`): the active office as the page shows it — its pills, its
	 * «Τοποθεσία», its phone: the profile's own facts, another office's answer, or (while it comes) its roster address.
	 */
	readonly officeView = $derived.by(() =>
		buildDoctorOfficeView({
			activeOfficeId: this.activeOfficeId,
			doctor: this.profile,
			officeFacts: this.#office.data,
			locale: this.locale
		})
	);

	get now(): number {
		return this.#options.now();
	}

	/**
	 * The page's sections (U-34.3: each only with data); U-43.2: the summary's «Άμεση επιβεβαίωση» follows the ACTIVE
	 * office's `policy.confirmationMode` of its slots.
	 */
	readonly content = $derived.by(() =>
		buildDoctorDetailContent({
			doctor: this.profile,
			locale: this.locale,
			now: this.now,
			confirmationMode: this.activeOfficeId
				? this.availabilityByOffice[this.activeOfficeId]?.confirmationMode
				: undefined
		})
	);

	/** «Τοποθεσία» of the active office (U-39.1). */
	get location() {
		return this.officeView.location;
	}

	/** The office pills (none for one office). */
	get officeTabs() {
		return this.officeView.tabs;
	}

	/** «Δείτε παρόμοιους» (U-37.2): the specialty and the ACTIVE office's city (the roster's, else the profile's). */
	readonly similarSearch = $derived.by(() => {
		const id = this.activeOfficeId;
		const roster = this.profile.offices?.find((office) => office.officeId === id);
		return buildDoctorSimilarSearch(this.profile, roster?.city ?? this.profile.office?.city);
	});

	/** Whether cases 1 or 2 are on screen (no services, or every window answered without a time). */
	get #showsSimilar(): boolean {
		if ((this.profile.services ?? []).length === 0) return true;
		return (
			this.availabilityState === 'answered' &&
			!hasAnyBookableSlot(this.profile.offices, this.availabilityByOffice)
		);
	}

	/** The catalogue's area of the similar search, once read; `null` before, or without one. */
	get similarArea(): DoctorSimilarArea | null {
		return this.#similarArea.data ?? null;
	}

	readonly availabilitySection = $derived.by(() =>
		buildDoctorAvailabilitySection({
			offices: this.profile.offices,
			availabilityByOffice: this.availabilityByOffice,
			activeOfficeId: this.activeOfficeId,
			locale: this.locale,
			now: this.now
		})
	);

	readonly booking = $derived.by(() =>
		buildDoctorBookingContent({
			doctor: this.profile,
			availabilityByOffice: this.availabilityByOffice,
			availabilityState: this.availabilityState,
			activeOfficeId: this.activeOfficeId,
			activePhone: this.officeView.phone,
			serviceId: this.serviceId,
			selectedSlot: this.selectedSlot,
			similarHref: this.#options.similarHref(this.similarSearch, this.similarArea),
			locale: this.locale,
			now: this.now
		})
	);

	/** The window «Διαθεσιμότητα» for an office (the window may look at another one before confirming). */
	availabilityModal(officeId: string | undefined) {
		return buildDoctorAvailabilityModalContent({
			offices: this.profile.offices,
			availabilityByOffice: this.availabilityByOffice,
			activeOfficeId: officeId,
			locale: this.locale,
			now: this.now
		});
	}

	readonly servicesModal = $derived.by(() =>
		buildDoctorServicesModalContent(this.profile, this.locale)
	);

	readonly reviewsModal = $derived.by(() =>
		buildDoctorReviewsModalContent({
			doctor: this.profile,
			reviews: this.#reviews.data,
			locale: this.locale
		})
	);

	/** The reviews' read: `waiting`, `failed`, `answered` (every field read). */
	get reviewsState() {
		return readQueryState(this.#reviews);
	}

	retryReviews = () => void this.#reviews.refetch();

	/** A window's address in the page's language (a link: it works without JavaScript too). */
	detailsHref = (section: DoctorDetailSection, hints: DoctorDetailHints = {}): ResolvedPathname =>
		resolve(this.#detailsPath(section, hints) as Pathname);

	get profileHref(): ResolvedPathname {
		return resolve(this.#profilePath as Pathname);
	}

	/** A window's address in the page's language, before `resolve`. */
	#detailsPath(section: DoctorDetailSection, hints: DoctorDetailHints = {}): string {
		return this.#options.localize(doctorDetailsPath(this.profile.doctorSlug, section, hints));
	}

	get #profilePath(): string {
		return this.#options.localize(doctorProfilePath(this.profile.doctorSlug));
	}

	/** Opens a window in place: its own address in the history (shallow routing), so «πίσω» closes it. */
	openWindow = (section: DoctorDetailSection, hints: DoctorDetailHints = {}) => {
		pushState(resolve(this.#detailsPath(section, hints) as Pathname), {
			doctorDetails: { section, ...hints, inPlace: true }
		});
	};

	/**
	 * The viewer moved to another photo (its place, from 0: the application's `focus`): its address follows in place,
	 * the history keeps its length (a swipe is no step «back» undoes).
	 */
	showPhoto = (index: number) => {
		const inPlace = page.state?.doctorDetails?.inPlace === true;
		const focus = String(index);
		replaceState(resolve(this.#detailsPath('photos', { focus }) as Pathname), {
			doctorDetails: { section: 'photos', focus, inPlace }
		});
	};

	/**
	 * Closes the open window: one opened in place goes back in the history (the entry before it); one the page was
	 * loaded with (the details route) turns the address into the profile's, in place.
	 */
	closeWindow = () => {
		if (page.state?.doctorDetails?.inPlace) history.back();
		else replaceState(resolve(this.#profilePath as Pathname), { doctorDetails: null });
	};

	/** Confirms a time of the window: it becomes the page's time and its office the active one (U-40.3). */
	confirmSlot = (slot: DoctorSelectedSlot) => {
		this.selectedSlot = slot;
		this.chosenOfficeId = slot.officeId;
	};
}
