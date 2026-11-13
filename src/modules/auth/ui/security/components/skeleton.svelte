<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { label, rows = 1, testId }: { label: string; rows?: number; testId: string } = $props();
</script>

<!-- A part of «Σύνδεση και ασφάλεια» while its read is out: its rows wait (the 58's way). -->
<div data-testid={testId} aria-busy="true" aria-label={label} class="mt-3 grid gap-3">
	{#each { length: rows }, row (row)}
		<div aria-hidden="true">
			<Skeleton class="h-control-lg w-full rounded-md" />
		</div>
	{/each}
</div>
