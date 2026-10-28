<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { IoniconName } from '$shared/ui/icons/ionicon';
	import { metaLineSizes, type MetaLineSize } from '$shared/ui/primitives/rating';

	/** The text size of a fact: the card's meta line (`MetaLineSize` of `Rating`, U-05.3). */
	export type MetaRowSize = MetaLineSize;
	/** The glyph's colour: muted, the brand primary, or the rating colour (S-32.11). */
	export type MetaRowIconTone = 'muted' | 'primary' | 'rating';
	/** The label's colour: the text colour, muted, or the primary text colour (S-32.19). */
	export type MetaRowTone = 'foreground' | 'muted' | 'primary';

	/** One fact: a glyph and the caller's words. */
	export type MetaRowItem = {
		key: string;
		icon: IoniconName;
		iconTone: MetaRowIconTone;
		label: string;
		tone: MetaRowTone;
		/** Semibold (the score). */
		emphasis?: boolean;
		/** This fact's own size; else the row's. */
		size?: MetaRowSize;
		/** One line, cut with «…». */
		singleLine?: boolean;
		testId?: string;
		labelTestId?: string;
	};

	const iconTones: Record<MetaRowIconTone, string> = {
		muted: 'text-muted-foreground',
		primary: 'text-primary',
		rating: 'text-rating'
	};
	const labelTones: Record<MetaRowTone, string> = {
		foreground: 'text-foreground',
		muted: 'text-muted-foreground',
		primary: 'text-primary-text'
	};

	export type MetaRowProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		items: readonly MetaRowItem[];
		size?: MetaRowSize;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let { items, size = 'md', class: className, ...restProps }: MetaRowProps = $props();
</script>

<!-- A wrapping row of small facts (the doctor card's online · score · reviews, `search-doctor-card:219-250`). -->
<div
	data-slot="meta-row"
	class={cn('flex flex-row flex-wrap items-center gap-x-3 gap-y-1.5', className)}
	{...restProps}
>
	{#each items as item (item.key)}
		<span data-slot="meta-row-item" data-testid={item.testId} class="flex items-center gap-1.5">
			<Ionicon name={item.icon} class={cn('icon-sm', iconTones[item.iconTone])} />
			<span
				data-testid={item.labelTestId}
				class={cn(
					item.emphasis && 'font-semibold',
					metaLineSizes[item.size ?? size],
					labelTones[item.tone],
					item.singleLine && 'line-clamp-1'
				)}>{item.label}</span
			>
		</span>
	{/each}
</div>
