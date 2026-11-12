<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { label }: { label: string } = $props();

	const ROWS = [0, 1, 2];
</script>

<!-- Record §11.2 (`55-relatives/appt.css:431-432` `.r-sk`): the list waits as three rows of 56, 12 apart. -->
<div data-testid="relatives-loading" aria-busy="true" aria-label={label} class="mt-4 grid gap-3">
	{#each ROWS as row (row)}
		<div aria-hidden="true">
			<Skeleton class="h-control-lg w-full rounded-md" />
		</div>
	{/each}
</div>
