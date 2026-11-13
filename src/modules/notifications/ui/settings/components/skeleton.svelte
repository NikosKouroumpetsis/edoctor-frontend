<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { label }: { label: string } = $props();

	const ROWS = [0, 1, 2];
</script>

<!-- «Ειδοποιήσεις» while its read is out: three rows wait (the 55's way, `relatives/components/skeleton.svelte`). -->
<div
	data-testid="notification-settings-loading"
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
