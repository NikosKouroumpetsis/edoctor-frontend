import type { DeviceCoordinates } from '$modules/search-doctors/api/marketplace/suggestions';
import {
	toWhereSelection,
	type CriteriaLocationOption
} from '$modules/search-doctors/lib/criteria-locations';
import {
	toWhatSelection,
	type CriteriaSuggestionOption
} from '$modules/search-doctors/lib/criteria-suggestions';
import {
	defaultSearchDoctorsCriteria,
	type SearchCriteriaField,
	type SearchCriteriaOption,
	type SearchDoctorsCriteria,
	type WhereSelection
} from '$modules/search-doctors/lib/search-criteria';
import { readFreshDeviceLocation, rememberDeviceLocation } from '$shared/state/device-location';
import { resolveDeviceLocation } from '$shared/lib/location';
import {
	currentLocationOptionValue,
	emptyQueries,
	nextCriteriaField,
	normalizeCriteria,
	setCriteriaValue
} from '../lib/fields';
import type {
	CriteriaLocationError,
	CriteriaQueryState,
	CriteriaSurface,
	SearchPanelField
} from '../types';

export type CriteriaStateOptions = {
	/** The search (the caller goes to the results); the criteria already normalized. */
	onSubmit: (criteria: SearchDoctorsCriteria) => void;
	/** Every close (the «×», Escape, a press outside the bar). */
	onClose?: () => void;
	/** The words of a device selection («Κοντά μου»), in the page's language. */
	currentLocationLabel: () => string;
	/**
	 * Criteria to seed each time the search opens (the results page, D3); the home passes none and keeps what it
	 * gathered across opens (the application's `initialCriteria`).
	 */
	initialCriteria?: () => SearchDoctorsCriteria | undefined;
};

/**
 * 🔴 The application's `useCriteriaModalState` (S-01.6, the same logic): the open card, the typing page, the
 * criteria, the typed words, «Κοντά μου» and the search that waits for its position (S-32.2, S-34.3). A Svelte
 * state reads the newest value at once, so the application's refs (a press handled before a re-render) hold here
 * by nature. Web (U-23.2): a choice opens the NEXT card («Τι» ⇒ «Πού» ⇒ «Πότε») instead of closing them all, and
 * the same state drives the phone's cards (`sheet`) and the bar from 744 (`bar`). Create it while a component is set
 * up: its teardown supersedes a position still being read (the application's unmount).
 */
export class CriteriaState {
	/** Where the search is open, or `null` (the application's `visible`). */
	surface = $state<CriteriaSurface | null>(null);
	/** The open card (< 744) or segment (≥ 744). */
	expandedField = $state<SearchCriteriaField | null>(null);
	/** The full typing page over the cards (< 744). */
	activeSearchPanel = $state<SearchPanelField | null>(null);
	criteria = $state.raw<SearchDoctorsCriteria>(defaultSearchDoctorsCriteria);
	queries = $state.raw<CriteriaQueryState>(emptyQueries);
	locationError = $state.raw<CriteriaLocationError | null>(null);
	isResolvingLocation = $state(false);
	isSubmitPending = $state(false);

	readonly visible = $derived(this.surface !== null);

	/**
	 * The last device fix «Κοντά μου» found in this visit (the application's store; on the web the tab's memory alone,
	 * S-07.3 rule 11): the «Πού» typeahead ranks by it, the results page searches by it.
	 */
	get deviceLocation(): DeviceCoordinates | null {
		return readFreshDeviceLocation();
	}

	#options: CriteriaStateOptions;
	// A double press never starts two reads of the position.
	#isResolving = false;
	// Bumped by every «Πού» move that makes a position still being read stale (a region, typing, clearing, a reset, an
	// open or a close): a late answer whose token is old commits nothing, and searches nothing for a press that waited.
	#whereInteraction = 0;
	#resolvingToken: number | null = null;
	#pendingSubmit = false;

	constructor(options: CriteriaStateOptions) {
		this.#options = options;
		// An unmount supersedes a position still being read (S-32.2), like a close.
		$effect(() => () => {
			this.#whereInteraction += 1;
		});
	}

	#cancelPendingSubmit() {
		this.#pendingSubmit = false;
		this.isSubmitPending = false;
	}

	/** A newer «Πού» move: a position still being read can no longer commit, nor search for a press that waited. */
	#supersedeLocationResolve() {
		this.#whereInteraction += 1;
		this.#cancelPendingSubmit();
	}

	/**
	 * S-32.2 (web): a browser's position request may never answer (its permission prompt is not modal: a click
	 * outside can hide it with no callback), so an open or a close lets the read go — «Κοντά μου» and the «Πού» rows
	 * work again, and the late answer, superseded, writes nothing. The application's prompt is modal: it never needs it.
	 */
	#releaseLocationRead() {
		this.#supersedeLocationResolve();
		this.#isResolving = false;
		this.#resolvingToken = null;
		this.isResolvingLocation = false;
	}

	/**
	 * Opens the search on `field` (the application's `visible` turning true): it re-seeds from `initialCriteria` when
	 * the caller gives one, clears the typed words and any message. The prototype opens «Τι» (U-23.2).
	 */
	open(surface: CriteriaSurface, field: SearchCriteriaField = 'what') {
		this.#releaseLocationRead();
		const seed = this.#options.initialCriteria?.();
		if (seed) this.criteria = seed;
		this.surface = surface;
		this.expandedField = field;
		this.activeSearchPanel = null;
		this.queries = emptyQueries;
		this.locationError = null;
	}

	/** Closes the search (the application's `visible` turning false); what was chosen stays for the next open. */
	close() {
		if (this.surface === null) return;
		this.#releaseLocationRead();
		this.surface = null;
		this.expandedField = null;
		this.activeSearchPanel = null;
		this.queries = emptyQueries;
		this.locationError = null;
		this.#options.onClose?.();
	}

	openSearchPanel(field: SearchPanelField) {
		this.expandedField = null;
		this.activeSearchPanel = field;
		this.locationError = null;
		this.queries = { ...this.queries, [field]: '' };
	}

	/** Back from the typing page: onto the card it came from (U-23.2, the prototype's «←»). */
	closeSearchPanel() {
		const field = this.activeSearchPanel;
		this.activeSearchPanel = null;
		this.locationError = null;
		if (field && this.expandedField === null) this.expandedField = field;
	}

	updateExpandedField(field: string | undefined) {
		const nextField = (field as SearchCriteriaField | undefined) ?? null;
		this.activeSearchPanel = null;
		this.expandedField = nextField;
		this.locationError = null;
		if (nextField) this.queries = { ...this.queries, [nextField]: '' };
	}

	updateQuery(field: SearchCriteriaField, value: string) {
		this.queries = { ...this.queries, [field]: value };
		if (field === 'what') {
			// Typing is free words: mirrored for the field, and any earlier structured choice dropped, so a stale
			// specialty or service never overrides the new words at the search.
			this.criteria = { ...this.criteria, what: value, whatSelection: null };
		} else if (field === 'where') {
			// The same for «Πού»: typing after a choice drops the location / device fix.
			this.#supersedeLocationResolve();
			this.criteria = { ...setCriteriaValue(this.criteria, field, value), whereSelection: null };
		}
	}

	clearField(field: SearchCriteriaField) {
		this.queries = { ...this.queries, [field]: '' };
		if (field === 'what') {
			this.criteria = { ...this.criteria, what: '', whatSelection: null };
		} else if (field === 'where') {
			this.#supersedeLocationResolve();
			this.criteria = {
				...setCriteriaValue(this.criteria, field, defaultSearchDoctorsCriteria[field]),
				whereSelection: null
			};
		} else {
			this.criteria = setCriteriaValue(this.criteria, field, defaultSearchDoctorsCriteria[field]);
		}
	}

	/** After a choice (U-23.2): the typing page closes and the next card opens, its words cleared. */
	#advanceFrom(field: SearchCriteriaField) {
		const next = nextCriteriaField[field];
		this.activeSearchPanel = null;
		this.locationError = null;
		this.expandedField = next;
		this.queries = { ...this.queries, [field]: '', [next]: '' };
	}

	/**
	 * A tapped specialty or service of «Τι»: the field takes its label and the structured selection, then «Πού» opens.
	 * A doctor is the caller's (it opens the doctor's page), never here.
	 */
	commitWhatSelection(option: CriteriaSuggestionOption) {
		const selection = toWhatSelection(option);
		this.criteria = { ...this.criteria, what: selection.label, whatSelection: selection };
		this.#advanceFrom('what');
	}

	/**
	 * A «Πού» value with its structured selection (or `null` for a plain static region): the field takes `value`, a
	 * position still being read is superseded, and «Πότε» opens.
	 */
	#commitWhere(value: string, selection: WhereSelection | null) {
		this.#supersedeLocationResolve();
		this.criteria = { ...this.criteria, where: value, whereSelection: selection };
		this.#advanceFrom('where');
	}

	/** A tapped location row (typed or ready): the row's big words in the field, its server `slug` for the search. */
	commitWhereLocation(option: CriteriaLocationOption) {
		this.#commitWhere(option.label, toWhereSelection(option));
	}

	#commitOption(field: SearchCriteriaField, value: string) {
		// A plain static region carries no structured selection: it drops a prior location or device fix.
		if (field === 'where') {
			this.#commitWhere(value, null);
			return;
		}
		this.criteria = setCriteriaValue(this.criteria, field, value);
		this.#advanceFrom(field);
	}

	/**
	 * «Κοντά μου»: reads the device's position, closing the typing page at once onto the «Πού» card and its busy row,
	 * so «Αναζήτηση» is never under it (S-32.2, Ε-31). A newer «Πού» move drops the answer; a press meanwhile is
	 * answered here — a position searches «Κοντά μου», a refusal or no position opens «Πού» on the message and searches
	 * nothing, never Αττική.
	 */
	async #resolveCurrentLocation(value: string) {
		if (this.#isResolving) return;

		const token = this.#whereInteraction;
		this.#isResolving = true;
		this.#resolvingToken = token;
		this.isResolvingLocation = true;
		this.locationError = null;
		this.activeSearchPanel = null;
		this.expandedField = 'where';
		this.queries = { ...this.queries, where: '' };

		try {
			const result = await resolveDeviceLocation();
			const submitWaiting = this.#pendingSubmit;

			if (this.#whereInteraction !== token) return;

			if (result.status === 'granted') {
				const selection: WhereSelection = {
					kind: 'current-location',
					label: this.#options.currentLocationLabel(),
					latitude: result.coords.latitude,
					longitude: result.coords.longitude
				};
				rememberDeviceLocation(result.coords);
				this.#commitWhere(value, selection);
				if (submitWaiting) this.#options.onSubmit(normalizeCriteria(this.criteria));
				return;
			}

			this.locationError =
				result.status === 'denied'
					? { kind: 'denied', canOpenSettings: !result.canAskAgain }
					: { kind: 'unavailable' };
			this.activeSearchPanel = null;
			this.expandedField = 'where';
		} finally {
			// Only the read still in charge lets go (S-32.2, web): one an open or a close released already, whose answer
			// came late, never touches a newer read or the press waiting on it.
			if (this.#resolvingToken === token) {
				this.#isResolving = false;
				this.#resolvingToken = null;
				this.isResolvingLocation = false;
				this.#cancelPendingSubmit();
			}
		}
	}

	selectOption(field: SearchCriteriaField, option: SearchCriteriaOption) {
		if (field === 'where' && option.value === currentLocationOptionValue) {
			void this.#resolveCurrentLocation(option.value);
			return;
		}
		this.#commitOption(field, option.value);
	}

	/** «Διαγραφή όλων»: the criteria back to empty, «Τι» open, a position still being read superseded. */
	resetCriteria() {
		this.#supersedeLocationResolve();
		this.criteria = defaultSearchDoctorsCriteria;
		this.queries = emptyQueries;
		this.expandedField = 'what';
		this.activeSearchPanel = null;
		this.locationError = null;
	}

	/** Searches now, or — while «Κοντά μου» is still reading the position it was asked for — once it arrives (S-32.2). */
	submitCriteria() {
		if (this.#isResolving && this.#resolvingToken === this.#whereInteraction) {
			this.#pendingSubmit = true;
			this.isSubmitPending = true;
			return;
		}
		this.#options.onSubmit(normalizeCriteria(this.criteria));
	}

	/**
	 * Escape or «×» (the application's `closeOrCollapse`): the typing page first, then the window. U-23.2 keeps one
	 * card open at a time, so there is no step that folds the cards.
	 */
	closeOrCollapse() {
		if (this.activeSearchPanel) {
			this.closeSearchPanel();
			return;
		}
		this.close();
	}
}
