<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Spinner } from '$shared/ui/primitives/spinner';

	let {
		title,
		line,
		icon,
		busy,
		onclick,
		testId
	}: {
		title: string;
		/** The muted line under it (a suggestion's town). */
		line?: string;
		icon: Snippet;
		/** A spinner in the tile, presses refused (the browser is asked for its position). */
		busy: boolean;
		onclick: () => void;
		testId: string;
	} = $props();
</script>

<!-- Record §6.7.2 (Airbnb's 9.32.03): the 48 tile with its glyph, the words beside it (16/500 over one 14 muted line), at
     least 64 high. Google's words are data, here as text nodes (U-65.6). No colour under the pointer (U-100). -->
<button
	type="button"
	data-testid={testId}
	disabled={busy}
	class="flex min-h-control-xl w-full flex-row items-center gap-3.5 py-2 text-left text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
	{onclick}
>
	<span
		aria-hidden="true"
		class="grid size-icon-tile shrink-0 place-items-center rounded-md bg-foreground/5 text-foreground"
	>
		{#if busy}
			<Spinner tone="muted" />
		{:else}
			{@render icon()}
		{/if}
	</span>
	<span class="flex min-w-0 flex-col">
		<span class="text-body-lg font-medium">{title}</span>
		{#if line}
			<span class="text-body-sm text-muted-foreground">{line}</span>
		{/if}
	</span>
</button>
