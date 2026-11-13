<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	let {
		icon,
		label,
		href,
		onclick,
		chevron = true,
		disabled = false,
		testId
	}: {
		icon: IoniconName;
		label: string;
		/** A page; without one the row is a button. */
		href?: ResolvedPathname | null;
		onclick?: () => void;
		/** «›» at the end: a row that opens something. «Αποσύνδεση» opens nothing, so it has none (U-164 Ε3). */
		chevron?: boolean;
		/** A button row whose press is on its way (the sign-out): it takes no second one. */
		disabled?: boolean;
		testId: string;
	} = $props();

	const rowClass =
		'flex min-h-row w-full flex-row items-center gap-3.5 text-start text-body-lg text-foreground outline-none transition-opacity duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70 disabled:opacity-50';
</script>

<!-- A row of the «Προφίλ» (record §5.1, `56-profile/prof.css:32-36` `.p-row`): 56 high, the 24 glyph · 14 · the word 16 ·
     the 20 «›» muted. A page is a link, a window of the frame or the sign-out a button. No colour under the pointer (U-100). -->
{#snippet content()}
	<span class="grid size-6 shrink-0 place-items-center">
		<Ionicon name={icon} class="icon-lg" />
	</span>
	<span class="min-w-0 flex-1">{label}</span>
	{#if chevron}
		<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
	{/if}
{/snippet}

{#if href}
	<a {href} data-testid={testId} class={rowClass}>{@render content()}</a>
{:else}
	<button type="button" data-testid={testId} class={rowClass} {disabled} {onclick}>
		{@render content()}
	</button>
{/if}
