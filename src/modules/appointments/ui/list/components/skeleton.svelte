<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { label }: { label: string } = $props();

	const ROWS = [0, 1, 2];
</script>

<!-- Record §6.1: the list waits as three cards of the same box (`appts.js:93`): the photo, three lines. -->
<div data-testid="appointments-loading" aria-busy="true" aria-label={label} class="grid gap-3">
	{#each ROWS as row (row)}
		<div aria-hidden="true" class="flex flex-row gap-4 rounded-md border border-line p-4">
			<Skeleton class="size-avatar-xl shrink-0 rounded-sm" />
			<div class="grid flex-1 content-start gap-2">
				<Skeleton class="h-3.5 w-1/3 rounded-xs" />
				<Skeleton class="h-3.5 w-4/5 rounded-xs" />
				<Skeleton class="h-3.5 w-3/5 rounded-xs" />
			</div>
		</div>
	{/each}
</div>
