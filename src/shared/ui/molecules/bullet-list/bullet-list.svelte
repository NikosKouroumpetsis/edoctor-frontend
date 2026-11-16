<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		items,
		testId,
		class: className
	}: {
		/** Each line a sentence of its own, already localized by the caller. */
		items: readonly string[];
		testId?: string;
		class?: string;
	} = $props();
</script>

<!-- `appt.css:353-355` (`.a-then`, «Τι θα γίνει» under a reason's words; shared since D-W51-50): short muted lines 13,
     each with its dot, 6 apart. Every word a text node (U-65.6). -->
{#if items.length > 0}
	<ul
		data-slot="bullet-list"
		data-testid={testId}
		class={cn(
			'mt-1 grid list-disc gap-1.5 ps-4 text-label-lg font-normal text-muted-foreground',
			className
		)}
	>
		{#each items as item, index (index)}
			<li>{item}</li>
		{/each}
	</ul>
{/if}
