<script lang="ts">
	import { ScrollArea } from './index';
	import type { ScrollAreaOrientation } from './index';

	let {
		orientation = 'vertical',
		count = 20
	}: { orientation?: ScrollAreaOrientation; count?: number } = $props();
</script>

<ScrollArea {orientation} class="h-40 w-60 rounded-md border border-border">
	<div data-testid="scroll-content" class="p-3">
		{#each Array.from({ length: count }, (_, i) => i + 1) as n (n)}
			<p class="py-1 text-sm">Row {n}</p>
		{/each}
	</div>
</ScrollArea>
