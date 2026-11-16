<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { label, testId = 'doctor-today-loading' }: { label: string; testId?: string } = $props();

	const CARDS = [0, 1, 2];
</script>

<!-- The page waits as three cards of the same box (the patient's list's way, record §6.1): the circle, three lines. -->
<div data-testid={testId} aria-busy="true" aria-label={label} class="mt-6 grid gap-3">
	{#each CARDS as card (card)}
		<div aria-hidden="true" class="flex flex-row gap-3.5 rounded-md border border-line-2 p-4">
			<Skeleton class="size-avatar-lg shrink-0 rounded-full" />
			<div class="grid flex-1 content-start gap-2">
				<Skeleton class="h-3.5 w-1/3 rounded-xs" />
				<Skeleton class="h-3.5 w-4/5 rounded-xs" />
				<Skeleton class="h-3.5 w-3/5 rounded-xs" />
			</div>
		</div>
	{/each}
</div>
