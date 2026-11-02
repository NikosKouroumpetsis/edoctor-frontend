import { tick } from 'svelte';
import { MAP_SHEET_HALF_SHARE, type MapSheetSnap } from '$shared/ui/organisms/map-sheet';
import { MAP_VIEW_FIT_PADDING, type MapViewPadding } from '$shared/ui/organisms/map-view';
import type { DesktopMap } from '../types';

/**
 * 🔴 The results stage (§7.2, the application's `useResultsStage`): the page's own layout state — the phone sheet's
 * rest, the 744 map switch, the open pin, the hovered card and, from 1128, the map `split | expanded | hidden`
 * (U-28.2). Never the address (S-07.3 rule 11) or a storage; every class it picks from 1128 is a `laptop:` one, so
 * below 1128 the three are the same page. The nodes it measures or focuses are bound by the page's units.
 */
export class ResultsStage {
	snap = $state<MapSheetSnap>('half');
	/** 744–1127: the map instead of the list (the floating «Εμφάνιση χάρτη» ⇄ «Εμφάνιση λίστας»). */
	mapShown = $state(false);
	desktopMap = $state<DesktopMap>('split');
	selectedId = $state<string | null>(null);
	hotId = $state<string | null>(null);

	/** The page's root, the sheet's list, the map's pane and the phone's bar (bound by the units that draw them). */
	pageRoot = $state<HTMLElement | null>(null);
	listScroll = $state<HTMLElement | null>(null);
	mapPane = $state<HTMLElement | null>(null);
	phoneBar = $state<HTMLElement | null>(null);

	/** U-28.1 / U-28.2: the list's columns from 1128 — 2 · 3 · 4 beside the map, 3 · 4 · 5 without it. */
	readonly desktopColumns = $derived(
		this.desktopMap === 'hidden'
			? 'laptop:grid-cols-3 desktop:grid-cols-4 wide:grid-cols-5'
			: 'laptop:grid-cols-2 desktop:grid-cols-3 wide:grid-cols-4'
	);

	/** The phone's bar is on screen below 744 only (CSS): its being drawn says which search surface to open. */
	get onPhone(): boolean {
		return this.phoneBar !== null && this.phoneBar.getClientRects().length > 0;
	}

	/** A new search or filter: the list from its top, the phone's sheet at half, no pin open. */
	resetList = (): void => {
		if (this.listScroll) this.listScroll.scrollTop = 0;
		this.snap = 'half';
		this.selectedId = null;
	};

	/** A card of the list under the pointer: its pin grows (and shrinks back once it leaves). */
	hover = (id: string, hovering: boolean): void => {
		if (hovering) this.hotId = id;
		else if (this.hotId === id) this.hotId = null;
	};

	/**
	 * The room around the pins when a search's are fitted: below 744 (the phone's bar drawn) the sheet lies over the
	 * map's lower half — a new search always rests it at `half` — so the bottom keeps that half clear as well.
	 */
	mapFitPadding = (): MapViewPadding => {
		const room = MAP_VIEW_FIT_PADDING;
		if (!this.mapPane || !this.onPhone) return room;
		const covered = this.mapPane.clientHeight * MAP_SHEET_HALF_SHARE;
		return { top: room, right: room, left: room, bottom: covered + room };
	};

	/** «Χάρτης»: the sheet down to its top strip; the focus goes to its handle (MINOR-8 β: the button is gone). */
	showMap = async (): Promise<void> => {
		this.snap = 'peek';
		await tick();
		this.pageRoot?.querySelector<HTMLElement>('[data-slot="map-sheet-handle"]')?.focus();
	};

	/** A pin was pressed: the phone lowers its sheet, so the card shows above it. */
	selectPin = (): void => {
		if (this.snap !== 'peek') this.snap = 'peek';
	};

	/** U-28.2: «⤢» ⇒ the map over the whole stage, the page at its top (so the map shows); «×» ⇒ back beside the list. */
	setMapExpanded = (expanded: boolean): void => {
		this.desktopMap = expanded ? 'expanded' : 'split';
		if (expanded) (document.scrollingElement ?? document.documentElement).scrollTop = 0;
	};

	/**
	 * U-28.2: «Απόκρυψη χάρτη» (from 1128 only) ⇒ the list alone; the pressed pill is gone, so the focus goes to the
	 * floating «Εμφάνιση χάρτη» that takes its place.
	 */
	hideMap = async (): Promise<void> => {
		this.desktopMap = 'hidden';
		this.mapShown = false;
		await tick();
		this.pageRoot?.querySelector<HTMLElement>('[data-testid="results-map-toggle"]')?.focus();
	};

	/**
	 * The floating switch. 744–1127: list ⇄ map. With the map hidden (from 1128) it is «Εμφάνιση χάρτη»: the map comes
	 * back beside the list and the focus goes to «Απόκρυψη χάρτη», which takes the switch's place; the same press
	 * below 1128 shows the map there, as a press on «Εμφάνιση χάρτη» always does (the switch stays, so its focus too).
	 */
	toggleMap = async (): Promise<void> => {
		if (this.desktopMap !== 'hidden') {
			this.mapShown = !this.mapShown;
			return;
		}
		this.desktopMap = 'split';
		this.mapShown = true;
		await tick();
		this.pageRoot?.querySelector<HTMLElement>('[data-slot="map-view-hide"]')?.focus();
	};
}
