<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	let {
		href,
		icon,
		label,
		title,
		body,
		name,
		onclick,
		testId,
		class: className
	}: {
		/** The page it opens, already resolved by the caller. */
		href: string;
		/** The muted glyph on the left. */
		icon: IoniconName;
		/** The small muted word over it, already localized («Το ραντεβού»). */
		label: string;
		/** Its strong line (a day and an hour, a service), when `body` draws none of its own. */
		title?: string;
		/** The strong line drawn by the caller (stars and a day), in place of `title`. */
		body?: Snippet;
		/** The whole link's name aloud, when its words alone do not say it (stars drawn as glyphs). */
		name?: string;
		/** A press of the link, the caller's (a step of its history); a link that is not taken over follows `href`. */
		onclick?: (event: MouseEvent) => void;
		testId?: string;
		class?: string;
	} = $props();
</script>

<!-- A framed link to what a card is about (`64-switch/sw.css:596-601` `.w-rvap`): the muted glyph, the small word 12
     muted over the strong line 14/600, «›» at the end; the line's hairline frame, the 12 corner, 48 at least. No
     colour under the pointer (U-100); every word a text node (U-65.6). -->
<!-- The caller's address, already resolved in the page's language. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	aria-label={name}
	{onclick}
	data-slot="link-card"
	data-testid={testId}
	class={cn(
		'flex min-h-touch w-full flex-row items-center gap-3 rounded-md border border-line px-3.5 py-2.5 text-start text-foreground transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70',
		className
	)}
>
	<Ionicon name={icon} class="icon-md shrink-0 text-muted-foreground" />
	<span class="grid min-w-0 flex-1 gap-px">
		<span class="text-label-md text-muted-foreground">{label}</span>
		{#if body}
			{@render body()}
		{:else if title}
			<span class="text-body-sm font-semibold wrap-anywhere">{title}</span>
		{/if}
	</span>
	<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
