<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type ListHeaderProps = {
		/** The page's one `h1`. */
		title: string;
		/** Extra classes of the h1 (`max-tablet:sr-only` where a phone's bar says the page's name). */
		titleClass?: string;
		/** The search under the title (the kit's `SearchPill`). */
		search?: Snippet;
		/** The chips under the search, in one row that drags sideways on the phone and wraps from 744. */
		chips?: Snippet;
		/** The chips' landmark name (the caller's words). */
		chipsLabel?: string;
		/** The chosen chip's key: when the row drags sideways, the chosen chip comes into view (on load and on change). */
		chosen?: string | null;
		/** Under the chips (a chosen filter on its own line, a language note). */
		below?: Snippet;
		class?: string;
		testId?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		title,
		titleClass,
		search,
		chips,
		chipsLabel,
		chosen,
		below,
		class: className,
		testId
	}: ListHeaderProps = $props();

	let row = $state<HTMLElement | null>(null);
	let settled = false;

	// 🔴 U-58.1 (the prototype 08 Π1, the application's chips): the chosen chip comes into the row's view by itself — at
	// once on load, smoothly on a change; a row that does not drag (from 744 it wraps) never moves.
	$effect(() => {
		void chosen;
		const nav = row;
		const chip = nav?.querySelector<HTMLElement>('[aria-current="page"], [data-state="on"]');
		if (!nav || !chip) return;
		const box = nav.getBoundingClientRect();
		const own = chip.getBoundingClientRect();
		const inset = Number.parseFloat(getComputedStyle(nav).paddingLeft) || 0;
		const delta =
			own.left < box.left + inset
				? own.left - box.left - inset
				: own.right > box.right - inset
					? own.right - box.right + inset
					: 0;
		if (delta !== 0) nav.scrollBy?.({ left: delta, behavior: settled ? 'smooth' : 'instant' });
		settled = true;
	});
</script>

<!-- 🔴 U-57.2 / U-60.1 (common v2 §D, the prototypes 06 v3 and 08): from 744 a list's head IN THE CENTRE — the h1
     (40 bold), the search 24 under it, the chips 16 under the search, wrapping, centred. Below 744 the application's
     (U-58.1): the page's name in the bar (`titleClass` `max-tablet:sr-only`), the search 20 under it, the chips 12
     under the search on one row that drags sideways from the left, the chosen one brought into view. -->
<header
	data-slot="list-header"
	data-testid={testId}
	class={cn('flex w-full flex-col items-center text-center', className)}
>
	<h1
		class={cn(
			'text-heading-xl font-bold text-balance text-foreground tablet:text-display-md',
			titleClass
		)}
	>
		{title}
	</h1>
	{#if search}
		<div data-slot="list-header-search" class="mt-1 w-full tablet:mt-6">
			{@render search()}
		</div>
	{/if}
	{#if chips}
		<nav
			bind:this={row}
			aria-label={chipsLabel}
			data-slot="list-header-chips"
			class="-mx-gutter-sm mt-2 scrollbar-none flex flex-row justify-start gap-x-2 self-stretch overflow-x-auto px-gutter-sm tablet:mx-0 tablet:mt-3 tablet:flex-wrap tablet:justify-center-safe tablet:px-0"
		>
			{@render chips()}
		</nav>
	{/if}
	{@render below?.()}
</header>
