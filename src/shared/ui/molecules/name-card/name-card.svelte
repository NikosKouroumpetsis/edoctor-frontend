<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		initial,
		title,
		line,
		testId = 'name'
	}: {
		/** The first letter of the name, or none (a person's glyph then). */
		initial: string | null;
		title: string | null;
		/** The line under the name: a sign-in address as the SERVER hides it (U-168), a specialty of the catalogue. */
		line: string | null;
		/** The parts' ids: `<id>-card`, `<id>-initial`, `<id>` (the name) and `<id>-line`. */
		testId?: string;
	} = $props();
</script>

<!-- 🔴 The name card of an account menu (the «Προφίλ» of screen 56, D-W45-18, `56-profile/prof.css:13-17` `.p-card`; the
     doctor's «Μενού» of screen 76): the 24 corner and the card's shadow; the initial 34 / 600 in its 88 circle on the warm
     (a person's glyph when no name is known), the name 22 / 600 and its line 14 muted. 🔴 U-164 Ε2 Β · U-164.1: it is NOT
     pressed — a plain box, never a link or a button. Every word is a text node (U-65.6). -->
<div
	data-slot="name-card"
	data-testid={`${testId}-card`}
	class="grid w-full justify-items-center rounded-xl border border-line bg-card px-4 pt-reading-crumbs pb-6 text-center shadow-overlay"
>
	<span
		aria-hidden="true"
		data-testid={`${testId}-initial`}
		class="grid size-profile-initial place-items-center rounded-full bg-muted text-display-xs font-semibold text-foreground"
	>
		{#if initial}
			{initial}
		{:else}
			<Ionicon name="person" class="icon-xl text-muted-foreground" />
		{/if}
	</span>
	{#if title}
		<p data-testid={testId} class="mt-3 max-w-full text-heading-sm text-foreground">
			{title}
		</p>
	{/if}
	{#if line}
		<p data-testid={`${testId}-line`} class="mt-0.5 max-w-full text-body-sm text-muted-foreground">
			{line}
		</p>
	{/if}
</div>
