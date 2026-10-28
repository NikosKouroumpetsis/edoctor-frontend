<script lang="ts">
	let { count = 3, testId }: { count?: number; testId?: string } = $props();

	const rows = $derived(Array.from({ length: count }, (_, row) => row));
</script>

<!-- The application's still rows (study D6) in the shape of an option row — a square glyph box and a label bar —
     while its list loads. They do not breathe (the application draws plain views). Decorative: the list that waits
     says it is busy (`aria-busy`, the caller's). -->
<div
	data-slot="option-row-skeleton"
	data-testid={testId}
	aria-hidden="true"
	class="flex flex-col gap-1"
>
	{#each rows as row (row)}
		<div class="flex min-h-row flex-row items-center gap-2.5 rounded-md px-2 py-2">
			<div class="size-control-sm rounded-md bg-foreground/5"></div>
			<div class="h-3 flex-1 rounded-full bg-muted"></div>
		</div>
	{/each}
</div>
