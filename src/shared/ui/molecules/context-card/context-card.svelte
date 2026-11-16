<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';

	let {
		leading,
		label,
		title,
		lines = [],
		trailing,
		testId,
		class: className
	}: {
		/** The circle on the left (a photo, the initials), the caller's. */
		leading?: Snippet;
		/** The small word over it, already localized («Το ραντεβού σας»). */
		label: string;
		/** Its strong line (the day and the hour). */
		title: string;
		/** The muted lines under it, each its own (a person · a service, an address, for whom); empty ones are left out. */
		lines?: readonly (string | null | undefined)[];
		/** One way on at the right (`sw.js:615` `.a-chg`: «Αλλαγή» of a chosen person), the caller's. */
		trailing?: Snippet;
		testId?: string;
		class?: string;
	} = $props();

	const shown = $derived(lines.filter((line): line is string => Boolean(line)));
</script>

<!-- `appt.css:261-266` (`.a-ctx`; shared since D-W51-50): what a screen is about, over the screen it opens — the circle
     56 on the left, the word 12 muted, the strong line 15/600, the muted lines 13; the band with its line, the 12
     corner; a caller's way on at the right (D-W51-70, the words then take the room between). Every word a text node
     (U-65.6). -->
<div
	data-slot="context-card"
	data-testid={testId}
	class={cn(
		'mb-5 flex flex-row items-center gap-3 rounded-md border border-line bg-background px-3.5 py-3',
		className
	)}
>
	{@render leading?.()}
	<div class={cn('grid min-w-0', trailing && 'flex-1')}>
		<span class="text-label-md font-medium text-muted-foreground">{label}</span>
		<span class="text-body-md font-semibold text-foreground">{title}</span>
		{#each shown as line, index (index)}
			<span class="text-label-lg font-normal text-muted-foreground">{line}</span>
		{/each}
	</div>
	{@render trailing?.()}
</div>
