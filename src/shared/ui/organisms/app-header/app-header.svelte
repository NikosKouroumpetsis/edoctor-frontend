<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';

	let {
		brand,
		nav,
		actions,
		class: className
	}: {
		/** The home link with the mark (left). */
		brand: Snippet;
		/** The primary navigation, after the brand. */
		nav?: Snippet;
		/** The controls at the right end (language, theme, sign-in). */
		actions?: Snippet;
		class?: string;
	} = $props();
</script>

<!-- The sticky top bar of a page (U-03.8), a size container so its parts can appear by its width (`@narrow:`). -->
<header
	data-slot="app-header"
	class={cn(
		'@container sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur supports-backdrop-filter:bg-background/75',
		className
	)}
>
	<div class="container-page flex h-bar-top items-center gap-4">
		{@render brand()}
		{@render nav?.()}
		{#if actions}
			<div class="ml-auto flex items-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</div>
</header>
