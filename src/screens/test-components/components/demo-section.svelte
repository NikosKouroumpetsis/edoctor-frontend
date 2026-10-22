<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		id,
		title,
		description,
		children
	}: {
		id: string;
		title: string;
		description?: string;
		children: Snippet;
	} = $props();
</script>

<section {id} class="scroll-mt-bar-top" data-slot="demo-section" data-section={id}>
	<header class="mb-4 border-b border-border pb-3">
		<h2 class="text-heading-md">{title}</h2>
		{#if description}
			<p class="mt-1 text-body-sm text-muted-foreground">{description}</p>
		{/if}
	</header>
	<div class="space-y-section">
		{@render children()}
	</div>
</section>
