<script lang="ts" module>
	/** Which side the sticky column takes from 950: `end` (Airbnb's listing card) or `start` (its service page). */
	export type TwoColumnAsidePosition = 'start' | 'end';

	// A 12-column grid from 950, no `[..]`: the main column 7 wide, one column of air, the aside 4 wide — Airbnb's
	// 653 + 373 in 1120, its 290 at 950 and its 323 at 1128, by the same fractions.
	const mainClasses: Record<TwoColumnAsidePosition, string> = {
		end: 'split:col-span-7 split:col-start-1',
		start: 'split:col-span-7 split:col-start-6'
	};
	const asideClasses: Record<TwoColumnAsidePosition, string> = {
		end: 'split:col-span-4 split:col-start-9',
		start: 'split:col-span-4 split:col-start-1'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		aside,
		asidePosition = 'end',
		stickyAside = true,
		class: className,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The side column: the booking card, the identity card. */
		aside: Snippet;
		asidePosition?: TwoColumnAsidePosition;
		/** Keep the aside in view below the 64 top bar while the main column scrolls (from 950). */
		stickyAside?: boolean;
		/** The main column. */
		children: Snippet;
	} = $props();
</script>

{#snippet sideColumn()}
	<div
		data-slot="two-column-detail-aside"
		class={cn(
			'min-w-0',
			asideClasses[asidePosition],
			stickyAside && 'split:sticky split:top-bar-top split:self-start'
		)}
	>
		{@render aside()}
	</div>
{/snippet}

<!-- One column below 950 (in the source order, the start aside first), two from 950 (Airbnb's listing page). -->
<div
	data-slot="two-column-detail"
	data-aside={asidePosition}
	class={cn('flex flex-col gap-section split:grid split:grid-cols-12 split:gap-x-0', className)}
	{...restProps}
>
	{#if asidePosition === 'start'}
		{@render sideColumn()}
	{/if}
	<div data-slot="two-column-detail-main" class={cn('min-w-0', mainClasses[asidePosition])}>
		{@render children()}
	</div>
	{#if asidePosition === 'end'}
		{@render sideColumn()}
	{/if}
</div>
