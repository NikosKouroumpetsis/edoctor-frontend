<script lang="ts" module>
	import type { ContainerZone } from '$shared/ui/molecules/container';

	export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6;
	export type GridColumnsByZone = Partial<Record<ContainerZone, GridColumns>>;
	/** The spacing roles between cells: 8 · 12 · 16 · 24 · 32. */
	export type GridGap = 'inline' | 'rail' | 'list' | 'grid' | 'section';

	/** The column count per zone, in full class names (Tailwind reads no built strings). */
	export const gridColumnClasses: Record<ContainerZone, Record<GridColumns, string>> = {
		phone: {
			1: 'grid-cols-1',
			2: 'grid-cols-2',
			3: 'grid-cols-3',
			4: 'grid-cols-4',
			5: 'grid-cols-5',
			6: 'grid-cols-6'
		},
		tablet: {
			1: 'tablet:grid-cols-1',
			2: 'tablet:grid-cols-2',
			3: 'tablet:grid-cols-3',
			4: 'tablet:grid-cols-4',
			5: 'tablet:grid-cols-5',
			6: 'tablet:grid-cols-6'
		},
		split: {
			1: 'split:grid-cols-1',
			2: 'split:grid-cols-2',
			3: 'split:grid-cols-3',
			4: 'split:grid-cols-4',
			5: 'split:grid-cols-5',
			6: 'split:grid-cols-6'
		},
		laptop: {
			1: 'laptop:grid-cols-1',
			2: 'laptop:grid-cols-2',
			3: 'laptop:grid-cols-3',
			4: 'laptop:grid-cols-4',
			5: 'laptop:grid-cols-5',
			6: 'laptop:grid-cols-6'
		},
		desktop: {
			1: 'desktop:grid-cols-1',
			2: 'desktop:grid-cols-2',
			3: 'desktop:grid-cols-3',
			4: 'desktop:grid-cols-4',
			5: 'desktop:grid-cols-5',
			6: 'desktop:grid-cols-6'
		},
		wide: {
			1: 'wide:grid-cols-1',
			2: 'wide:grid-cols-2',
			3: 'wide:grid-cols-3',
			4: 'wide:grid-cols-4',
			5: 'wide:grid-cols-5',
			6: 'wide:grid-cols-6'
		}
	};

	const gapClasses: Record<GridGap, string> = {
		inline: 'gap-inline',
		rail: 'gap-rail',
		list: 'gap-list',
		grid: 'gap-grid',
		section: 'gap-section'
	};

	const ZONES: ContainerZone[] = ['phone', 'tablet', 'split', 'laptop', 'desktop', 'wide'];

	/** The column classes of a count, or of a count per zone (a zone keeps the last count named below it). */
	export function gridColumnClassesOf(columns: GridColumns | GridColumnsByZone): string {
		const byZone: GridColumnsByZone = typeof columns === 'number' ? { phone: columns } : columns;
		return ZONES.map((zone) => {
			const count = zone === 'phone' ? (byZone.phone ?? 1) : byZone[zone];
			return count ? gridColumnClasses[zone][count] : '';
		})
			.filter(Boolean)
			.join(' ');
	}
</script>

<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		items,
		renderItem,
		keyExtractor,
		columns = 1,
		gap = 'grid',
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLUListElement>, 'children'> & {
		items: T[];
		/** One cell (the application's `renderItem`). */
		renderItem: Snippet<[T, number]>;
		/** A stable key per item; the index when absent. */
		keyExtractor?: (item: T, index: number) => string | number;
		/** A count, or a count per zone from the phone up: `{ phone: 1, tablet: 2, split: 3, laptop: 4, desktop: 5 }`. */
		columns?: GridColumns | GridColumnsByZone;
		gap?: GridGap;
	} = $props();
</script>

<!-- Equal cells in every row, the short last one too (the application pads its rows with empty cells; a CSS grid
     keeps the column width by itself). The zones are classes, so the server renders the right columns. -->
<!-- `role="list"` keeps the list for VoiceOver, which drops it under `list-style: none`. -->
<ul
	role="list"
	data-slot="responsive-grid"
	class={cn('grid', gridColumnClassesOf(columns), gapClasses[gap], className)}
	{...restProps}
>
	{#each items as item, index (keyExtractor ? keyExtractor(item, index) : index)}
		<li class="min-w-0">{@render renderItem(item, index)}</li>
	{/each}
</ul>
