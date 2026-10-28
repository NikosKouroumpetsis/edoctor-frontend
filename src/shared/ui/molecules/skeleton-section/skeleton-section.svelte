<script lang="ts">
	import { SkeletonCard } from '$shared/ui/molecules/skeleton-card';
	import { SkeletonLines } from '$shared/ui/molecules/skeleton-lines';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let {
		cardCount = 3,
		cardTestId,
		testId
	}: {
		cardCount?: number;
		/** Names every card. */
		cardTestId?: string;
		testId?: string;
	} = $props();

	const cards = $derived(Array.from({ length: cardCount }, (_, index) => index));
</script>

<!-- The application's rail section placeholder: the title and subtitle lines beside the round control, over a
     sideways row of rail cards, cut at its own edge (no scroll bar, nothing to scroll to). Decorative: the section
     that waits says it is busy (`aria-busy`, the caller's). -->
<div
	data-slot="skeleton-section"
	data-testid={testId}
	aria-hidden="true"
	class="flex flex-col gap-3.5"
>
	<div class="flex flex-row items-start justify-between gap-4">
		<SkeletonLines
			class="flex-1 gap-2"
			lines={[
				{ height: 'h-control-xs', width: 'w-3/4' },
				{ height: 'h-5', width: 'w-3/5' }
			]}
		/>
		<Skeleton class="mt-0.5 size-control-sm rounded-full" />
	</div>

	<div class="overflow-hidden">
		<div class="flex flex-row gap-3 pb-1">
			{#each cards as card (card)}
				<SkeletonCard layout="carousel" testId={cardTestId} />
			{/each}
		</div>
	</div>
</div>
