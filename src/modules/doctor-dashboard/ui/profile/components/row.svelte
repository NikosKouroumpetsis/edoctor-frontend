<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { DoctorProfileRow } from '$modules/doctor-dashboard/lib/profile';

	let {
		row,
		href = null,
		selected = false
	}: {
		row: DoctorProfileRow;
		/** The section's own page, resolved in the page's language; none until its screen is built (D-W45-02). */
		href?: string | null;
		/** From 950 this section's page stands beside the list: the row is the current one, on the grey pill. */
		selected?: boolean;
	} = $props();

	const rowClass = 'flex min-h-row w-full flex-row items-center gap-3.5 py-2 text-start';
</script>

<!-- 🔴 D-W52-24 (`64-switch/sw.js` `pfList`, `sw.css` `.w-pfrows`): one section of «Το προφίλ μου» — the 24 glyph (with the
     8 dot when something is missing), its name 16 (15 in the menu from 950, `set.css` `.s-menu .p-row`), under it what
     it holds now (14, muted) and what it lacks (14 / 500, the strong colour). A section whose screen is built is a
     link with «›»; until then the row is words alone — no button, no «›», nothing to press. 🔴 D-W52-41 (`sw.css`
     `.p-row.on`): from 950 the section open beside the list is the current row — its name bold on the grey pill,
     `aria-current="page"`, and no «›» there (the page is already open). No colour under the pointer (U-100). Every
     word a text node. -->
{#snippet content()}
	<span class="relative grid size-6 shrink-0 place-items-center">
		<Ionicon name={row.icon} class="icon-lg" />
		{#if row.missing}
			<span
				aria-hidden="true"
				data-slot="doctor-profile-row-dot"
				class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent"
			></span>
		{/if}
	</span>
	<span class="flex min-w-0 flex-1 flex-col">
		<span
			data-slot="doctor-profile-row-label"
			class={['text-body-lg text-foreground split:text-body-md', selected && 'split:font-semibold']}
			>{row.label}</span
		>
		{#if row.has}
			<span data-slot="doctor-profile-row-has" class="text-body-sm text-muted-foreground"
				>{row.has}</span
			>
		{/if}
		{#if row.missing}
			<span data-slot="doctor-profile-row-missing" class="text-body-sm font-medium text-accent"
				>{row.missing}</span
			>
		{/if}
	</span>
	{#if href}
		<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground split:hidden" />
	{/if}
{/snippet}

<li
	data-testid={`doctor-profile-row-${row.id}`}
	data-missing={row.missing ? '' : undefined}
	data-selected={selected ? '' : undefined}
>
	{#if href}
		<!-- The page's address, already resolved in the page's language (a module knows no route). -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			{href}
			aria-current={selected ? 'page' : undefined}
			data-slot="doctor-profile-row"
			class={[
				rowClass,
				'transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70',
				selected && 'split:rounded-md split:bg-chip'
			]}
		>
			{@render content()}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{:else}
		<div data-slot="doctor-profile-row" class={rowClass}>{@render content()}</div>
	{/if}
</li>
