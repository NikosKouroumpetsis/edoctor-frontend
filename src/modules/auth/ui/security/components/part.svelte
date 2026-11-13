<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		help,
		testId,
		children
	}: {
		title: string;
		/** A line under the title (the devices' part). */
		help?: string;
		testId: string;
		children: Snippet;
	} = $props();

	const titleId = $derived(`${testId}-title`);
</script>

<!-- One of the three parts of «Σύνδεση και ασφάλεια» (record §5.4, `59-security/sec.css` `.c-h2`): its title 20 / 600 —
     36 above it, 20 above the first — an optional muted line, then its rows. -->
<section aria-labelledby={titleId} data-testid={testId} class="mt-reading-gap-sm first:mt-5">
	<h3 id={titleId} class="mb-1 text-title-lg font-semibold text-foreground">{title}</h3>
	{#if help}
		<p class="max-w-text text-body-sm text-muted-foreground">{help}</p>
	{/if}
	{@render children()}
</section>
