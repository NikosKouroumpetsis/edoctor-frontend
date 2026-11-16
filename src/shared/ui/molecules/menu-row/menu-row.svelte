<script lang="ts">
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	let {
		icon,
		label,
		href,
		onclick,
		chevron = true,
		disabled = false,
		dot = false,
		name,
		testId
	}: {
		icon: IoniconName;
		label: string;
		/** A page; without one the row is a button. */
		href?: string | null;
		/** A button row's press (a link has none: it is a page). */
		onclick?: (event: MouseEvent) => void;
		/** «›» at the end: a row that opens something. A row that opens nothing (a sign-out) has none (U-164 Ε3). */
		chevron?: boolean;
		/** A button row whose press is on its way (a sign-out): it takes no second one. */
		disabled?: boolean;
		/** The 8 dot before «›» while something is new (D-W45-17); `name` then says the whole row aloud. */
		dot?: boolean;
		/** The row's whole name aloud in place of its words («Ειδοποιήσεις, νέες»). */
		name?: string;
		testId?: string;
	} = $props();

	const rowClass =
		'flex min-h-row w-full flex-row items-center gap-3.5 text-start text-body-lg text-foreground outline-none transition-opacity duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70 disabled:opacity-50';
</script>

<!-- A row of an account menu (the «Προφίλ» of screen 56, `56-profile/prof.css:32-36` `.p-row`; the doctor's «Μενού» of
     screen 76): 56 high, the 24 glyph · 14 · the word 16 · the 20 «›» muted. A page is a link, anything else a button.
     No colour under the pointer (U-100). -->
{#snippet content()}
	<span class="grid size-6 shrink-0 place-items-center">
		<Ionicon name={icon} class="icon-lg" />
	</span>
	<span class="min-w-0 flex-1">{label}</span>
	{#if dot}
		<span aria-hidden="true" data-slot="menu-row-dot" class="size-2 shrink-0 rounded-full bg-accent"
		></span>
	{/if}
	{#if chevron}
		<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
	{/if}
{/snippet}

{#if href}
	<!-- The caller's address, already resolved in the page's language. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a {href} aria-label={name} data-slot="menu-row" data-testid={testId} class={rowClass}
		>{@render content()}</a
	>
{:else}
	<button
		type="button"
		aria-label={name}
		data-slot="menu-row"
		data-testid={testId}
		class={rowClass}
		{disabled}
		{onclick}
	>
		{@render content()}
	</button>
{/if}
