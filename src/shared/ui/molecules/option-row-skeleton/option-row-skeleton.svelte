<script lang="ts" module>
	/** The row it stands for: `md` (default) the criteria row, `xl` Airbnb's search row (`OptionRow size="xl"`). */
	export type OptionRowSkeletonSize = 'md' | 'xl';

	const rowSizes: Record<OptionRowSkeletonSize, string> = {
		md: 'min-h-row gap-2.5 rounded-md px-2',
		xl: 'min-h-row-lg gap-4 rounded-lg px-4'
	};
	const tileSizes: Record<OptionRowSkeletonSize, string> = {
		md: 'size-control-sm',
		xl: 'size-tile'
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		count = 3,
		size = 'md',
		testId
	}: { count?: number; size?: OptionRowSkeletonSize; testId?: string } = $props();

	const rows = $derived(Array.from({ length: count }, (_, row) => row));
</script>

<!-- The application's still rows (study D6) in the shape of an option row — a square glyph box and a label bar —
     while its list loads. They do not breathe (the application draws plain views). Decorative: the list that waits
     says it is busy (`aria-busy`, the caller's). -->
<div
	data-slot="option-row-skeleton"
	data-testid={testId}
	aria-hidden="true"
	class="flex flex-col gap-1"
>
	{#each rows as row (row)}
		<div class={cn('flex flex-row items-center py-2', rowSizes[size])}>
			<div class={cn('rounded-md bg-foreground/5', tileSizes[size])}></div>
			<div class="h-3 flex-1 rounded-full bg-muted"></div>
		</div>
	{/each}
</div>
