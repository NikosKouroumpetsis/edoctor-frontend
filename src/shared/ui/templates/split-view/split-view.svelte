<script lang="ts" module>
	/** The list's width from 950: `wide` 420 (460 from 1128, the default), `inbox` 380 (400 from 1128). */
	export type SplitViewWidths = 'wide' | 'inbox';

	// From 950 the screen under the site's bar, the list and what it opened side by side. Whole classes per width
	// (Tailwind reads only written classes).
	const rootClasses: Record<SplitViewWidths, string> = {
		wide: 'split:grid split:h-split split:grid-split',
		inbox: 'split:grid split:h-split split:grid-inbox'
	};
	// Each column scrolls on its own from 950; the list keeps the line between them.
	const listClasses =
		'split:overflow-y-auto split:overscroll-contain split:border-r split:border-border/60';
	const paneClasses = 'split:min-h-0 split:overflow-y-auto split:overscroll-contain';
	// U-139.1: nothing for the right ⇒ from 950 one column of 640 in the middle of the screen, the page's height under
	// the bar (D-W4-66: the page's own colour reaches the bottom, never the body's under a short column).
	const soloClasses = 'split:mx-auto split:w-full split:max-w-split-solo';
	const soloRootClasses = 'split:min-h-page';
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
		/** The columns' names when they are regions of their own, already localized by the caller (U-03.5). */
		listLabel?: string;
		paneLabel?: string;
		/** The right column's box, which scrolls on its own from 950 (a caller takes it back to its top). */
		paneRef?: HTMLDivElement | null;
		/** The right column: what the list opened. */
		children: Snippet;
	} = $props();
</script>

<!-- The inbox's two columns (U-84 Π1, D-W4-52), now the template of every list that opens something beside it. Below
     950 one column: the list, or what it opened (`open`); from 950 the list (`widths`) and the rest side by side, each
     scrolling on its own under the site's bar. Both columns are always in the page, so the list keeps its place and its
     scroll while something opens; only CSS tells the zones apart (U-03.1). -->
<div
	data-slot="split-view"
	data-widths={widths}
	data-open={open || undefined}
	data-solo={solo || undefined}
	class={cn(solo ? soloRootClasses : rootClasses[widths], className)}
	{...restProps}
>
	<div
		data-slot="split-view-list"
		role={listLabel ? 'region' : undefined}
		aria-label={listLabel}
		class={cn(
			'min-w-0',
			open && 'hidden',
			solo ? !open && soloClasses : cn(listClasses, open && 'split:block')
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
			solo ? open && soloClasses : cn(paneClasses, !open && 'split:block')
		)}
	>
		{@render children()}
	</div>
</div>
