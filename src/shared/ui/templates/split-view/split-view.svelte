<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	/**
	 * The list's width once the columns stand side by side: `wide` 420 (460 from 1128, the default), `inbox` 380 (400
	 * from 1128), `menu` 340 (from 1128 30 % of the frame, never under 420) — a menu of sections, which the template also
	 * insets (32 over, 24 a side, 48 under; from 1128 40 over and the menu of 324 in the middle of its column, U-215.3).
	 */
	export type SplitViewWidths = 'wide' | 'inbox' | 'menu';

	/**
	 * Where the two columns begin: `split` 950 (the default, every list until wave 5.1), `laptop` 1128 (D-W51-36: a list
	 * whose cards carry their own answers needs the room before something opens beside it).
	 */
	export type SplitViewFrom = 'split' | 'laptop';

	/**
	 * A menu that folds (U-216.2, D-W52-14), as its `SplitViewFoldButton`s read it: whether it folds here at all (a
	 * `rail` was given, `widths="menu"`, not `solo`), its state, the zone's class that shows a control of the fold
	 * (none below the zone) and the press.
	 */
	export type SplitViewFold = {
		readonly foldable: boolean;
		readonly folded: boolean;
		readonly shown: string;
		toggle: () => void;
	};

	/** `findSplitViewFold` answers nothing outside a `SplitView`, where a fold button draws nothing. */
	export const [, setSplitViewFold, findSplitViewFold] = createContext<SplitViewFold>('SplitView');

	/** Every class of one breakpoint, written whole (Tailwind reads only written classes). */
	type SplitViewClasses = {
		/** 🔴 U-215.3 (D-W52-11): the page's frame, the bar's — as wide as the page, 1920 at most, centred beyond it. */
		frame: string;
		root: Record<SplitViewWidths, string>;
		/** The menu column's own inset (`57-settings/set.css` `.s-lcol`); a list of the other widths insets itself. */
		listInsets: Partial<Record<SplitViewWidths, string>>;
		/** Each column scrolls on its own; the list keeps the line between them. */
		list: string;
		pane: string;
		/** U-139.1: nothing for the right ⇒ one column of 640 in the middle, the page's height under the bar (D-W4-66). */
		solo: string;
		soloRoot: string;
		/** 🔴 U-167 (`57-settings/set.css` `.s-rcol`): the right column's inset and, in its MIDDLE, a box of at most 640. */
		centredPane: string;
		centre: string;
		/** What shows beside the other once they stand side by side. */
		shown: string;
		/** U-216.2 (D-W52-14, `64-switch/sw.css:431-449`): the root's column gliding to the rail's width and back. */
		foldRoot: string;
		/** The folding menu's column: the line, and a box that neither the gliding menu nor the rail leaves. */
		foldList: string;
		/** The menu in it, scrolling on its own: it leaves first (0.12 s) and comes back last (0.2 s after 0.12 s). */
		foldMenu: string;
		/** ONE width while the column glides (292, 324 from 1128), so its words never set again. */
		foldMenuBox: string;
		/** The rail over the column's start (72, 120 from 1128): it arrives last (0.2 s after 0.14 s), leaves first. */
		foldRail: string;
		/** A `SplitViewFoldButton`: nothing below the zone. */
		foldControl: string;
	};

	const CLASSES: Record<SplitViewFrom, SplitViewClasses> = {
		split: {
			frame: 'split:mx-auto split:w-full split:max-w-wide',
			root: {
				wide: 'split:grid split:h-split split:grid-split',
				inbox: 'split:grid split:h-split split:grid-inbox',
				menu: 'split:grid split:h-split split:grid-menu'
			},
			listInsets: {
				menu: 'split:px-6 split:pt-section split:pb-section-lg laptop:px-menu-centred laptop:pt-reading-gap'
			},
			list: 'split:overflow-y-auto split:overscroll-contain split:border-r split:border-border/60',
			pane: 'split:min-h-0 split:overflow-y-auto split:overscroll-contain',
			solo: 'split:mx-auto split:w-full split:max-w-split-solo',
			soloRoot: 'split:min-h-page',
			centredPane:
				'split:px-pane-inset split:pt-section split:pb-pane-inset-lg laptop:pt-reading-gap',
			centre: 'split:mx-auto split:w-full split:max-w-split-solo',
			shown: 'split:block',
			foldRoot:
				'group/split-fold split:transition-[grid-template-columns] split:duration-fold split:ease-standard split:data-folded:grid-rail',
			foldList: 'split:relative split:overflow-hidden split:border-r split:border-border/60',
			foldMenu:
				'split:h-full split:overflow-x-hidden split:overflow-y-auto split:overscroll-contain split:transition-opacity split:duration-fold-in split:ease-standard split:delay-fold-menu split:group-data-folded/split-fold:invisible split:group-data-folded/split-fold:opacity-0 split:group-data-folded/split-fold:transition-[opacity,visibility] split:group-data-folded/split-fold:duration-fold-out split:group-data-folded/split-fold:delay-0',
			foldMenuBox: 'split:w-menu-fixed',
			foldRail:
				'split:invisible split:absolute split:inset-y-0 split:left-0 split:flex split:w-split-rail split:flex-col split:items-center split:gap-3 split:overflow-y-auto split:overscroll-contain split:pt-section split:pb-section-lg split:opacity-0 split:transition-[opacity,visibility] split:duration-fold-out split:ease-standard laptop:w-split-rail-lg laptop:pt-reading-gap split:group-data-folded/split-fold:visible split:group-data-folded/split-fold:opacity-100 split:group-data-folded/split-fold:transition-opacity split:group-data-folded/split-fold:duration-fold-in split:group-data-folded/split-fold:delay-fold-rail',
			foldControl: 'hidden split:inline-flex'
		},
		laptop: {
			frame: 'laptop:mx-auto laptop:w-full laptop:max-w-wide',
			root: {
				wide: 'laptop:grid laptop:h-split laptop:grid-split',
				inbox: 'laptop:grid laptop:h-split laptop:grid-inbox',
				menu: 'laptop:grid laptop:h-split laptop:grid-menu'
			},
			listInsets: {
				menu: 'laptop:px-menu-centred laptop:pt-reading-gap laptop:pb-section-lg'
			},
			list: 'laptop:overflow-y-auto laptop:overscroll-contain laptop:border-r laptop:border-border/60',
			pane: 'laptop:min-h-0 laptop:overflow-y-auto laptop:overscroll-contain',
			solo: 'laptop:mx-auto laptop:w-full laptop:max-w-split-solo',
			soloRoot: 'laptop:min-h-page',
			centredPane: 'laptop:px-pane-inset laptop:pt-reading-gap laptop:pb-pane-inset-lg',
			centre: 'laptop:mx-auto laptop:w-full laptop:max-w-split-solo',
			shown: 'laptop:block',
			foldRoot:
				'group/split-fold laptop:transition-[grid-template-columns] laptop:duration-fold laptop:ease-standard laptop:data-folded:grid-rail',
			foldList: 'laptop:relative laptop:overflow-hidden laptop:border-r laptop:border-border/60',
			foldMenu:
				'laptop:h-full laptop:overflow-x-hidden laptop:overflow-y-auto laptop:overscroll-contain laptop:transition-opacity laptop:duration-fold-in laptop:ease-standard laptop:delay-fold-menu laptop:group-data-folded/split-fold:invisible laptop:group-data-folded/split-fold:opacity-0 laptop:group-data-folded/split-fold:transition-[opacity,visibility] laptop:group-data-folded/split-fold:duration-fold-out laptop:group-data-folded/split-fold:delay-0',
			foldMenuBox: 'laptop:w-menu-fixed',
			foldRail:
				'laptop:invisible laptop:absolute laptop:inset-y-0 laptop:left-0 laptop:flex laptop:w-split-rail-lg laptop:flex-col laptop:items-center laptop:gap-3 laptop:overflow-y-auto laptop:overscroll-contain laptop:pt-reading-gap laptop:pb-section-lg laptop:opacity-0 laptop:transition-[opacity,visibility] laptop:duration-fold-out laptop:ease-standard laptop:group-data-folded/split-fold:visible laptop:group-data-folded/split-fold:opacity-100 laptop:group-data-folded/split-fold:transition-opacity laptop:group-data-folded/split-fold:duration-fold-in laptop:group-data-folded/split-fold:delay-fold-rail',
			foldControl: 'hidden laptop:inline-flex'
		}
	};
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		list,
		rail,
		folded = $bindable(false),
		open = false,
		solo = false,
		widths = 'wide',
		from = 'split',
		centred = false,
		listLabel,
		paneLabel,
		paneRef = $bindable(null),
		class: className,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The left column: a list, its title, its states. */
		list: Snippet;
		/**
		 * 🔴 U-216.2 (D-W52-14), `widths="menu"` only: what the menu folds to — a rail of icons the caller draws (a
		 * `SplitViewFoldButton` and its sections' links). With it the menu folds; a `SplitViewFoldButton` in `list` too.
		 */
		rail?: Snippet;
		/** The menu is folded to its `rail`. Read only from the zone, and never with `solo`: below it the menu, whole. */
		folded?: boolean;
		/** Below 950 the right column shows instead of the list (the list stays in the page, hidden, with its scroll). */
		open?: boolean;
		/**
		 * 🔴 U-139.1: nothing goes on the right (a guest, a wait, a load, an error, an empty list): from 950 ONE column in
		 * the middle — the list, or the right column when `open` — never the list beside an empty side.
		 */
		solo?: boolean;
		widths?: SplitViewWidths;
		/** Where the columns begin standing side by side: 950 (`split`, the default) or 1128 (`laptop`, D-W51-36). */
		from?: SplitViewFrom;
		/**
		 * 🔴 U-167: from 950 what the right column shows sits in the MIDDLE of that column, at most 640 wide, inside the
		 * column's own inset — never pushed against the line. Nothing changes below 950, nor with `solo`.
		 */
		centred?: boolean;
		/** The columns' names when they are regions of their own, already localized by the caller (U-03.5). */
		listLabel?: string;
		paneLabel?: string;
		/** The right column's box, which scrolls on its own from 950 (a caller takes it back to its top). */
		paneRef?: HTMLDivElement | null;
		/** The right column: what the list opened; none for a `solo` list that opens nothing yet. */
		children?: Snippet;
	} = $props();

	const zone = $derived(CLASSES[from]);
	/** The menu has a rail to fold to; with `solo` there is nothing beside it to make room for. */
	const folding = $derived(Boolean(rail) && widths === 'menu');
	const foldable = $derived(folding && !solo);

	let menuRef = $state<HTMLDivElement | null>(null);
	let railRef = $state<HTMLDivElement | null>(null);
	// Below the zone the rail has no box, and the state is not read: the menu stays whole and live. The zone itself is
	// CSS alone (U-03.1) — only `inert`, which CSS cannot write, follows the rail's own box as the screen turns.
	let railDrawn = $state(true);
	$effect(() => {
		const node = railRef;
		if (!node || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => {
			railDrawn = getComputedStyle(node).display !== 'none';
		});
		observer.observe(node);
		return () => observer.disconnect();
	});
	const railLive = $derived(foldable && folded);
	const menuLive = $derived(!(railLive && railDrawn));

	/**
	 * The press of a `SplitViewFoldButton`: only the state changes (an attribute on the root — nothing is drawn again),
	 * then the focus goes to the button of the part that shows, which is in the page and visible at once.
	 */
	async function toggle() {
		folded = !folded;
		await tick();
		(folded ? railRef : menuRef)
			?.querySelector<HTMLElement>('[data-slot="split-view-fold"]')
			?.focus();
	}

	setSplitViewFold({
		get foldable() {
			return foldable;
		},
		get folded() {
			return folded;
		},
		get shown() {
			return zone.foldControl;
		},
		toggle
	});
</script>

<!-- The inbox's two columns (U-84 Π1, D-W4-52), now the template of every list that opens something beside it. Below
     950 (1128 with `from="laptop"`, D-W51-36) one column: the list, or what it opened (`open`); from there the list
     (`widths`) and the rest side by side, each scrolling on its own under the site's bar — the rest in the middle of its
     column with `centred` (U-167). Both columns are always in the page, so the list keeps its place and its scroll while
     something opens; only CSS tells the zones apart (U-03.1). 🔴 U-215.3 (D-W52-11): from its zone the whole stands in
     the page's frame, the bar's (1920 at most, centred beyond it), with `solo` too. U-216.2 (D-W52-14): with a `rail` the
     menu folds to it and back — the menu and the rail both stay in the page, the hidden one `inert`, and the column
     glides (CSS transitions on `data-folded`, whatever the device's motion setting). -->
<div
	data-slot="split-view"
	data-widths={widths}
	data-from={from}
	data-centred={centred || undefined}
	data-open={open || undefined}
	data-solo={solo || undefined}
	data-folded={railLive || undefined}
	class={cn(
		zone.frame,
		solo ? zone.soloRoot : zone.root[widths],
		foldable && zone.foldRoot,
		className
	)}
	{...restProps}
>
	<div
		data-slot="split-view-list"
		role={listLabel ? 'region' : undefined}
		aria-label={listLabel}
		class={cn(
			'min-w-0',
			open && 'hidden',
			solo
				? !open && zone.solo
				: cn(folding ? zone.foldList : cn(zone.list, zone.listInsets[widths]), open && zone.shown)
		)}
	>
		{#if folding && rail}
			<div
				bind:this={menuRef}
				data-slot="split-view-menu"
				inert={!menuLive}
				class={solo ? undefined : cn(zone.foldMenu, zone.listInsets.menu)}
			>
				<div data-slot="split-view-menu-box" class={solo ? undefined : zone.foldMenuBox}>
					{@render list()}
				</div>
			</div>
			<div
				bind:this={railRef}
				data-slot="split-view-rail"
				inert={!railLive}
				class={cn('hidden', !solo && zone.foldRail)}
			>
				{@render rail()}
			</div>
		{:else}
			{@render list()}
		{/if}
	</div>
	<div
		bind:this={paneRef}
		data-slot="split-view-pane"
		role={paneLabel ? 'region' : undefined}
		aria-label={paneLabel}
		class={cn(
			'min-w-0',
			!open && 'hidden',
			solo ? open && zone.solo : cn(zone.pane, centred && zone.centredPane, !open && zone.shown)
		)}
	>
		{#if centred}
			<!-- The same box with or without `solo` (which centres the whole column itself), so what it holds stays in place. -->
			<div data-slot="split-view-centre" class={solo ? undefined : zone.centre}>
				{@render children?.()}
			</div>
		{:else}
			{@render children?.()}
		{/if}
	</div>
</div>
