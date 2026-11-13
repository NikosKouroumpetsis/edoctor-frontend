<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { label }: { label: string } = $props();

	const ROWS = [0, 1, 2, 3];
</script>

<!-- «Προσωπικά στοιχεία» while the account's read is out: its rows wait (the 60's way). -->
<div
	data-testid="personal-details-loading"
	aria-busy="true"
	aria-label={label}
	class="mt-5 grid gap-3"
>
	{#each ROWS as row (row)}
		<div aria-hidden="true">
			<Skeleton class="h-control-lg w-full rounded-md" />
		</div>
	{/each}
</div>
