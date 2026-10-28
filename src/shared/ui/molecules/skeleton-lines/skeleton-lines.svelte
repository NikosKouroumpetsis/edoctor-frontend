<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/** A line's height: the class of the application's name (`'6'` ⇒ `h-6`); 16 (`h-4`) unless named. */
	export type SkeletonLineHeight =
		| 'h-3'
		| 'h-4'
		| 'h-5'
		| 'h-6'
		| 'h-control-xs'
		| 'h-control-sm'
		| 'h-hero-skeleton'
		| 'h-map-h';
	/** A line's width: the class of the application's fraction (`'4/5'` ⇒ `w-4/5`). */
	export type SkeletonLineWidth =
		| 'w-full'
		| 'w-11/12'
		| 'w-5/6'
		| 'w-4/5'
		| 'w-3/4'
		| 'w-2/3'
		| 'w-3/5'
		| 'w-1/2'
		| 'w-2/5'
		| 'w-1/3'
		| 'w-1/5';
	/** A pill (`line`) or a rounded block (`block`: a map, a photo). */
	export type SkeletonLineShape = 'line' | 'block';

	export type SkeletonLine = {
		height?: SkeletonLineHeight;
		shape?: SkeletonLineShape;
		/** 16 above it: the first line of a new paragraph. */
		startsGroup?: boolean;
		width: SkeletonLineWidth;
	};

	const shapeClasses: Record<SkeletonLineShape, string> = {
		block: 'rounded-xl',
		line: 'rounded-full'
	};

	/** The classes of one placeholder line, in the application's order (group break, height, width, shape). */
	export function skeletonLineClasses(line: SkeletonLine): string {
		return [
			line.startsGroup ? 'mt-4' : undefined,
			line.height ?? 'h-4',
			line.width,
			shapeClasses[line.shape ?? 'line']
		]
			.filter(Boolean)
			.join(' ');
	}
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let {
		lines,
		children,
		testId,
		class: className = 'gap-2'
	}: {
		lines: readonly SkeletonLine[];
		/** What follows the lines inside the same column. */
		children?: Snippet;
		testId?: string;
		/** Places the column, its gap first (`gap-2` unless the caller names its own). */
		class?: string;
	} = $props();
</script>

<!-- The application's column of pulsing placeholders, one per line. Decorative: the region that waits says it is
     busy (`aria-busy`, the caller's), not each line. -->
<div
	data-slot="skeleton-lines"
	data-testid={testId}
	aria-hidden="true"
	class={cn('flex flex-col', className)}
>
	{#each lines as line, index (index)}
		<Skeleton class={skeletonLineClasses(line)} />
	{/each}
	{@render children?.()}
</div>
