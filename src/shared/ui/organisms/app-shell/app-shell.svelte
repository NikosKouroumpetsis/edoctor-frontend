<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		header,
		footer,
		bottomNav,
		skipLinkLabel,
		contentId = 'content',
		children
	}: {
		/** The top bar (an `AppHeader`), sticky by its own classes. */
		header?: Snippet;
		footer?: Snippet;
		/** The mobile bar pinned to the bottom edge (a `BottomNav`). */
		bottomNav?: Snippet;
		/** With it, a «skip to content» link is the page's first stop for the keyboard. */
		skipLinkLabel?: string;
		/** The id of the content region the skip link moves to. */
		contentId?: string;
		children: Snippet;
	} = $props();
</script>

<!-- Layout only (U-03.8): the caller brings the header, footer and bottom bar, with their words and links. -->
<div data-slot="app-shell" class="flex min-h-dvh flex-col bg-background text-foreground">
	{#if skipLinkLabel}
		<a
			href={`#${contentId}`}
			class="sr-only inline-flex min-h-touch min-w-touch items-center rounded-md bg-card px-4 text-body-sm font-semibold text-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:ring-3 focus:ring-ring/50"
		>
			{skipLinkLabel}
		</a>
	{/if}

	{@render header?.()}

	<div id={contentId} class="flex-1">
		{@render children()}
	</div>

	{@render footer?.()}
	{@render bottomNav?.()}
</div>
