<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		children
	}: {
		label: string;
		children: Snippet;
	} = $props();
</script>

<div data-slot="demo-row">
	<p class="mb-2 text-label-md tracking-wide text-muted-foreground uppercase">{label}</p>
	<div class="flex flex-wrap items-center gap-4">
		{@render children()}
	</div>
</div>
