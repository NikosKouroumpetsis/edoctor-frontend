<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		label,
		mark,
		testId
	}: {
		/** Drawn while the switch runs (about a second, the caller's). */
		open: boolean;
		/** The one phrase, already localized («Μετάβαση στη λειτουργία γιατρού»). */
		label: string;
		/** What stands above the phrase (the caller's brand mark). */
		mark?: Snippet;
		testId?: string;
	} = $props();
</script>

<!-- The switch between two modes of the same account (wave 5.1 · screen 64, U-185.3; `64-switch/sw.css:28-35`, Airbnb's
     «Λειτουργία φιλοξενίας»): the whole screen on the page's own surface — no tint, no flash (U-100) — the mark and the
     phrase growing in, a line running under them. CSS alone, always played (U-12). -->
{#if open}
	<div
		role="status"
		aria-live="polite"
		data-slot="mode-transition"
		data-testid={testId}
		class="fixed inset-0 z-70 grid content-center justify-items-center gap-5 bg-card p-6 text-center text-foreground"
	>
		{#if mark}
			<span aria-hidden="true" class="animate-mode-in">{@render mark()}</span>
		{/if}
		<p class="animate-mode-in-late text-title-lg font-semibold tracking-tight">{label}</p>
		<span aria-hidden="true" class="relative h-1 w-cta-w overflow-hidden rounded-full bg-chip">
			<span class="absolute inset-y-0 left-0 w-2/5 animate-mode-run rounded-full bg-foreground"
			></span>
		</span>
	</div>
{/if}
