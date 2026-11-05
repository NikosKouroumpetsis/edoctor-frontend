<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	let {
		icon,
		label,
		href,
		onclick,
		testId
	}: {
		icon: IoniconName;
		label: string;
		/** A page; without one the row is a button. */
		href?: ResolvedPathname | null;
		onclick?: () => void;
		testId: string;
	} = $props();

	const rowClass =
		'flex min-h-touch w-full flex-row items-center gap-4 py-4 text-start text-foreground outline-none transition-opacity duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70';
</script>

<!-- The application's `ProfileMenuRow`: 48 at least, 16 over and under, the 24 glyph · 16 · the word 17 · the 20 › muted. -->
{#snippet content()}
	<span class="grid size-6 shrink-0 place-items-center">
		<Ionicon name={icon} class="icon-lg" />
	</span>
	<span class="min-w-0 flex-1 text-title-xs">{label}</span>
	<Ionicon name="chevron-forward" class="icon-md text-muted-foreground" />
{/snippet}

{#if href}
	<a {href} data-testid={testId} class={rowClass}>{@render content()}</a>
{:else}
	<button type="button" data-testid={testId} class={rowClass} {onclick}>
		{@render content()}
	</button>
{/if}
