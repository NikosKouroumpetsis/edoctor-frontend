<script lang="ts" module>
	import type { BottomNavHideFrom } from '$shared/ui/organisms/bottom-nav';

	export type FooterLink = {
		label: string;
		/** A page; without one the entry is a button the caller wires with `onclick`. */
		href?: string;
		onclick?: () => void;
	};

	export type FooterColumn = { title: string; links: FooterLink[] };

	// The columns' links (Airbnb's): the words in the text colour, underlined on hover, in a full touch box.
	const columnLinkClass =
		'inline-flex min-h-touch min-w-touch items-center text-start text-body-sm text-foreground hover:underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm';
	// MINOR-8 of r1: the room for a bar the page pins to the bottom (its measured height) until the zone it hides from.
	const pageBarReserveClasses: Record<BottomNavHideFrom, string> = {
		tablet: 'pb-page-bar tablet:pb-0',
		split: 'pb-page-bar split:pb-0',
		laptop: 'pb-page-bar laptop:pb-0',
		desktop: 'pb-page-bar desktop:pb-0'
	};
	// The legal row's links: the same look, side by side after the rights line. The touch box grows by the same 12
	// on both sides of every word (the 48 width never binds on a word), so the gaps around each «·» are equal.
	const legalLinkClass =
		'inline-flex min-h-touch min-w-touch items-center justify-center px-3 text-body-sm text-foreground hover:underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { bottomNavReserveClasses } from '$shared/ui/organisms/bottom-nav';

	let {
		columns,
		popular,
		actions,
		legalNote,
		legalLinks = [],
		reserveBottomNav = 'tablet',
		reservePageBar = false,
		'aria-label': ariaLabel
	}: {
		/** The link columns, with their words and hrefs already localized. */
		columns: FooterColumn[];
		/** Above the columns: Airbnb's «popular searches» (a `LinkDirectory` of the caller's links). */
		popular?: Snippet;
		/** The row above the rights line, at the left at every width (the language and the social networks). */
		actions?: Snippet;
		/** The bottom row's rights line, already localized. */
		legalNote?: string;
		/** The bottom row's legal entries, after the note. */
		legalLinks?: FooterLink[];
		/** Keep room for the bottom bar until the zone it hides from (`false`: no bar). */
		reserveBottomNav?: BottomNavHideFrom | false;
		/** Keep room for the page's own bar pinned at the bottom (`StickyActionBar` `room="page"`) until its zone. */
		reservePageBar?: BottomNavHideFrom | false;
		'aria-label'?: string;
	} = $props();
</script>

{#snippet columnLink(link: FooterLink)}
	{#if link.href}
		<a href={link.href} class={columnLinkClass}>{link.label}</a>
	{:else}
		<button type="button" class={columnLinkClass} onclick={() => link.onclick?.()}
			>{link.label}</button
		>
	{/if}
{/snippet}

{#snippet legalLink(link: FooterLink)}
	{#if link.href}
		<a href={link.href} class={legalLinkClass}>{link.label}</a>
	{:else}
		<button type="button" class={legalLinkClass} onclick={() => link.onclick?.()}
			>{link.label}</button
		>
	{/if}
{/snippet}

<!-- Airbnb's footer (U-16.9): on the grey band, the popular searches, then the columns (one column with rules
     between them on the phone, three from 744), the row of the language and the networks (U-17.4, U-18.2), and
     the rights line with the legal links. -->
<footer
	data-slot="site-footer"
	aria-label={ariaLabel}
	class={cn(
		'mt-section-lg border-t border-border bg-background',
		reserveBottomNav && bottomNavReserveClasses[reserveBottomNav],
		reservePageBar && pageBarReserveClasses[reservePageBar]
	)}
>
	<div class="container-page">
		{#if popular}
			<div data-slot="site-footer-popular" class="pt-section-lg">
				{@render popular()}
			</div>
		{/if}

		<div
			data-slot="site-footer-columns"
			class={cn(
				'grid grid-cols-1 tablet:grid-cols-3 tablet:gap-x-6',
				popular && 'border-t border-border'
			)}
		>
			<!-- Keys are position + target: two entries may share a label (the same page in two columns). -->
			{#each columns as column, columnIndex (`${columnIndex}:${column.title}`)}
				<div
					data-slot="site-footer-column"
					class="flex flex-col border-b border-border py-6 tablet:border-b-0 tablet:pt-section tablet:pb-section"
				>
					<h2 class="mb-2 text-body-sm font-semibold text-foreground">{column.title}</h2>
					{#each column.links as link, index (`${index}:${link.href ?? link.label}`)}
						{@render columnLink(link)}
					{/each}
				</div>
			{/each}
		</div>

		{#if actions}
			<div
				data-slot="site-footer-actions"
				class="flex flex-row flex-wrap items-center gap-x-6 gap-y-4 pt-6 pb-1 tablet:border-t tablet:border-border"
			>
				{@render actions()}
			</div>
		{/if}

		{#if legalNote || legalLinks.length > 0}
			<!-- «© 2026 eDoctor · Απόρρητο · Όροι · Cookies»: every «·» has 12 on each side (the note's and the links'
			     own room); on the phone the links start at the page's edge (the first one's room given back). -->
			<div
				data-slot="site-footer-legal"
				class="flex flex-col gap-1 py-6 text-body-sm text-foreground tablet:flex-row tablet:flex-wrap tablet:items-center tablet:pt-3"
			>
				{#if legalNote}
					<span
						data-slot="site-footer-legal-note"
						class="inline-flex min-h-touch items-center tablet:pr-3">{legalNote}</span
					>
					{#if legalLinks.length > 0}<span aria-hidden="true" class="hidden tablet:inline">·</span
						>{/if}
				{/if}
				{#if legalLinks.length > 0}
					<span class="-mx-3 flex flex-row flex-wrap items-center tablet:mx-0">
						{#each legalLinks as link, index (`${index}:${link.href ?? link.label}`)}
							{#if index > 0}<span aria-hidden="true">·</span>{/if}
							{@render legalLink(link)}
						{/each}
					</span>
				{/if}
			</div>
		{/if}
	</div>
</footer>
