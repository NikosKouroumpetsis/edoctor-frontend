<script lang="ts">
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { label }: { label: string } = $props();

	const ROWS = [0, 1, 2, 3];
</script>

<!-- Record §5.8 (`63-inbox/list.css:16` `.i-sk`): the list waits as four lines of its own box — the 44 circle and two
     lines of words over the row's rule. -->
<div data-testid="notifications-loading" aria-busy="true" aria-label={label} class="mt-2">
	{#each ROWS as row (row)}
		<div aria-hidden="true" class="flex flex-row items-start gap-3.5 border-b border-line py-4">
			<Skeleton class="size-inbox-glyph shrink-0 rounded-full" />
			<div class="grid flex-1 content-start gap-2 pt-1">
				<Skeleton class="h-3.5 w-3/5 rounded-xs" />
				<Skeleton class="h-3.5 w-4/5 rounded-xs" />
			</div>
		</div>
	{/each}
</div>
