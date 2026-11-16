<script lang="ts" module>
	/**
	 * The list's width once the columns stand side by side: `wide` 420 (460 from 1128, the default), `inbox` 380 (400
	 * from 1128), `menu` 340 (420 from 1128) — a menu of sections, which the template also insets (32 over, 24 a side,
	 * 48 under; 40 over and 48 a side from 1128).
	 */
	export type SplitViewWidths = 'wide' | 'inbox' | 'menu';

	/**
	 * Where the two columns begin: `split` 950 (the default, every list until wave 5.1), `laptop` 1128 (D-W51-36: a list
	 * whose cards carry their own answers needs the room before something opens beside it).
	 */
	export type SplitViewFrom = 'split' | 'laptop';

	/** Every class of one breakpoint, written whole (Tailwind reads only written classes). */
	type SplitViewClasses = {
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
	};

	const CLASSES: Record<SplitViewFrom, SplitViewClasses> = {
		split: {
			root: {
				wide: 'split:grid split:h-split split:grid-split',
				inbox: 'split:grid split:h-split split:grid-inbox',
				menu: 'split:grid split:h-split split:grid-menu'
			},
			listInsets: {
				menu: 'split:px-6 split:pt-section split:pb-section-lg laptop:px-pane-inset laptop:pt-reading-gap'
			},
			list: 'split:overflow-y-auto split:overscroll-contain split:border-r split:border-border/60',
			pane: 'split:min-h-0 split:overflow-y-auto split:overscroll-contain',
			solo: 'split:mx-auto split:w-full split:max-w-split-solo',
			soloRoot: 'split:min-h-page',
			centredPane:
				'split:px-pane-inset split:pt-section split:pb-pane-inset-lg laptop:pt-reading-gap',
			centre: 'split:mx-auto split:w-full split:max-w-split-solo',
			shown: 'split:block'
		},
		laptop: {
			root: {
				wide: 'laptop:grid laptop:h-split laptop:grid-split',
				inbox: 'laptop:grid laptop:h-split laptop:grid-inbox',
				menu: 'laptop:grid laptop:h-split laptop:grid-menu'
			},
			listInsets: {
				menu: 'laptop:px-pane-inset laptop:pt-reading-gap laptop:pb-section-lg'
			},
			list: 'laptop:overflow-y-auto laptop:overscroll-contain laptop:border-r laptop:border-border/60',
			pane: 'laptop:min-h-0 laptop:overflow-y-auto laptop:overscroll-contain',
			solo: 'laptop:mx-auto laptop:w-full laptop:max-w-split-solo',
			soloRoot: 'laptop:min-h-page',
			centredPane: 'laptop:px-pane-inset laptop:pt-reading-gap laptop:pb-pane-inset-lg',
			centre: 'laptop:mx-auto laptop:w-full laptop:max-w-split-solo',
			shown: 'laptop:block'
		}
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		list,
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
		/** The right column: what the list opened. */
		children: Snippet;
	} = $props();

	const zone = $derived(CLASSES[from]);
</script>

<!-- The inbox's two columns (U-84 Π1, D-W4-52), now the template of every list that opens something beside it. Below
     950 (1128 with `from="laptop"`, D-W51-36) one column: the list, or what it opened (`open`); from there the list
     (`widths`) and the rest side by side, each scrolling on its own under the site's bar — the rest in the middle of its
     column with `centred` (U-167). Both columns are always in the page, so the list keeps its place and its scroll while
     something opens; only CSS tells the zones apart (U-03.1). -->
<div
	data-slot="split-view"
	data-widths={widths}
	data-from={from}
	data-centred={centred || undefined}
	data-open={open || undefined}
	data-solo={solo || undefined}
	class={cn(solo ? zone.soloRoot : zone.root[widths], className)}
	{...restProps}
>
	<div
		data-slot="split-view-list"
		role={listLabel ? 'region' : undefined}
		aria-label={listLabel}
		class={cn(
			'min-w-0',
			open && 'hidden',
			solo ? !open && zone.solo : cn(zone.list, zone.listInsets[widths], open && zone.shown)
		)}
	>
		{@render list()}
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
				{@render children()}
			</div>
		{:else}
			{@render children()}
		{/if}
	</div>
</div>
