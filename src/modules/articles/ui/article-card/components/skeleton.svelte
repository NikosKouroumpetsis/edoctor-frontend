<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	// One box per line of the `list` card, with the card's own text class: an empty line of that text is its height (U-92.3).
	const lines = [
		{ text: 'text-body-lg', width: 'w-full' },
		{ text: 'text-body-lg', width: 'w-3/4' },
		{ text: '-mt-1 text-body-sm', width: 'w-full' },
		{ text: 'text-body-sm', width: 'w-5/6' },
		{ text: 'text-label-lg leading-tight', width: 'w-1/2' }
	];
</script>

<!-- The list's placeholder in the card's own shape (U-57.2) and height (U-92.3): the 4:3 photo, two lines of title, two of
     the short description, the meta, so the words below it do not move when the card arrives. Decorative; it breathes
     through the kit's `Skeleton` whatever the device's motion setting (U-12.1). -->
<div data-slot="article-card-skeleton" aria-hidden="true" class="flex w-full flex-col gap-2.5">
	<Skeleton class="aspect-4/3 h-auto w-full rounded-lg" />
	<div class="flex flex-col">
		{#each lines as line, index (index)}
			<div data-slot="article-card-skeleton-line" class={cn('flex items-center', line.text)}>
				&#8203;<Skeleton class={cn('h-3 rounded-full', line.width)} />
			</div>
		{/each}
	</div>
</div>
