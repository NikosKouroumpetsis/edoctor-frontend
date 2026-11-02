<script lang="ts" module>
	/** Which side the sticky column takes: `end` (Airbnb's listing card) or `start` (its service page). */
	export type TwoColumnAsidePosition = 'start' | 'end';
	/**
	 * The zone from which the page is two columns: `split` (950, the default) or `tablet` (744: the doctor's profile,
	 * wave 1.5 — Airbnb's listing is two columns already at 744).
	 */
	export type TwoColumnFrom = 'split' | 'tablet';

	// A 12-column grid from the zone, no `[..]`: the main column 7 wide, one column of air, the aside 4 wide — Airbnb's
	// 653 + 373 in 1120, its 290 at 950 and its 323 at 1128, by the same fractions. Whole classes per zone (Tailwind
	// reads only written classes).
	const rootClasses: Record<TwoColumnFrom, string> = {
		split: 'split:grid split:grid-cols-12 split:gap-x-0',
		tablet: 'tablet:grid tablet:grid-cols-12 tablet:gap-x-0'
	};
	const mainClasses: Record<TwoColumnFrom, Record<TwoColumnAsidePosition, string>> = {
		split: {
			end: 'split:col-span-7 split:col-start-1',
			start: 'split:col-span-7 split:col-start-6'
		},
		tablet: {
			end: 'tablet:col-span-7 tablet:col-start-1',
			start: 'tablet:col-span-7 tablet:col-start-6'
		}
	};
	const asideClasses: Record<TwoColumnFrom, Record<TwoColumnAsidePosition, string>> = {
		split: {
			end: 'split:col-span-4 split:col-start-9',
			start: 'split:col-span-4 split:col-start-1'
		},
		tablet: {
			end: 'tablet:col-span-4 tablet:col-start-9',
			start: 'tablet:col-span-4 tablet:col-start-1'
		}
	};
	const stickyClasses: Record<TwoColumnFrom, string> = {
		split: 'split:sticky split:top-bar-top split:self-start',
		tablet: 'tablet:sticky tablet:top-bar-top tablet:self-start'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		aside,
		asidePosition = 'end',
		from = 'split',
		stickyAside = true,
		class: className,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The side column: the booking card, the identity card. */
		aside: Snippet;
		asidePosition?: TwoColumnAsidePosition;
		/** The zone from which it is two columns (`split` 950 by default). */
		from?: TwoColumnFrom;
		/** Keep the aside in view below the 64 top bar while the main column scrolls (from the zone). */
		stickyAside?: boolean;
		/** The main column. */
		children: Snippet;
	} = $props();
</script>

{#snippet sideColumn()}
	<div
		data-slot="two-column-detail-aside"
		class={cn('min-w-0', asideClasses[from][asidePosition], stickyAside && stickyClasses[from])}
	>
		{@render aside()}
	</div>
{/snippet}

<!-- One column below the zone (in the source order, the start aside first), two from it (Airbnb's listing page). -->
<div
	data-slot="two-column-detail"
	data-aside={asidePosition}
	data-from={from}
	class={cn('flex flex-col gap-section', rootClasses[from], className)}
	{...restProps}
>
	{#if asidePosition === 'start'}
		{@render sideColumn()}
	{/if}
	<div data-slot="two-column-detail-main" class={cn('min-w-0', mainClasses[from][asidePosition])}>
		{@render children()}
	</div>
	{#if asidePosition === 'end'}
		{@render sideColumn()}
	{/if}
</div>
