<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { count = 6, testId }: { count?: number; testId?: string } = $props();

	const tiles = $derived(Array.from({ length: count }, (_, index) => index));
</script>

<!-- The application's placeholder of a rail of icon tabs: a row of round tiles, each over a short label line. The
     row is cut at its own edge (the application's screen cuts it), so it never widens the page. Decorative. -->
<div
	data-slot="skeleton-rail"
	data-testid={testId}
	aria-hidden="true"
	class="flex flex-row gap-5 overflow-hidden px-1 py-2"
>
	{#each tiles as tile (tile)}
		<div class="flex shrink-0 flex-col items-center gap-2">
			<Skeleton class="size-tile rounded-full" />
			<Skeleton class="h-4 w-full rounded-full" />
		</div>
	{/each}
</div>
