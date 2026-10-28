<script lang="ts" module>
	import type { BottomNavHideFrom } from '$shared/ui/organisms/bottom-nav';

	export type FooterLink = {
		label: string;
		/** A page; without one the entry is a button the caller wires with `onclick`. */
		href?: string;
		onclick?: () => void;
	};

	export type FooterColumn = { title: string; links: FooterLink[] };

	// The footer's link look: columns and the legal row alike, a full touch box around a text link.
	const linkClass =
		'inline-flex min-h-touch min-w-touch items-center text-start text-body-sm text-muted-foreground transition-colors hover:text-foreground hover:underline outline-none focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { bottomNavReserveClasses } from '$shared/ui/organisms/bottom-nav';

	let {
		columns,
		legalNote,
		legalLinks = [],
		actions,
		reserveBottomNav = 'laptop',
		'aria-label': ariaLabel
	}: {
		/** The link columns, with their words and hrefs already localized. */
		columns: FooterColumn[];
		/** The bottom row's rights line, already localized. */
		legalNote?: string;
		/** The bottom row's legal entries, after the note. */
		legalLinks?: FooterLink[];
		/** The bottom row's right part (language, theme, social). */
		actions?: Snippet;
		/** Keep room for the bottom bar until the zone it hides from (`false`: no bar). */
		reserveBottomNav?: BottomNavHideFrom | false;
		'aria-label'?: string;
	} = $props();
</script>

{#snippet footerLink(link: FooterLink)}
	{#if link.href}
		<a href={link.href} class={linkClass}>{link.label}</a>
	{:else}
		<button type="button" class={linkClass} onclick={() => link.onclick?.()}>{link.label}</button>
	{/if}
{/snippet}

<footer
	data-slot="site-footer"
	aria-label={ariaLabel}
	class={cn(
		'mt-section-lg border-t border-border bg-card',
		reserveBottomNav && bottomNavReserveClasses[reserveBottomNav]
	)}
>
	<div class="container-page py-section-lg">
		<div class="grid grid-cols-2 gap-x-section gap-y-section tablet:grid-cols-3">
			<!-- Keys are position + target: two entries may share a label (the same page in two columns). -->
			{#each columns as column, columnIndex (`${columnIndex}:${column.title}`)}
				<div class="flex flex-col gap-touch-gap">
					<h2 class="text-label-lg font-semibold text-foreground">{column.title}</h2>
					{#each column.links as link, index (`${index}:${link.href ?? link.label}`)}
						{@render footerLink(link)}
					{/each}
				</div>
			{/each}
		</div>
	</div>

	{#if legalNote || legalLinks.length > 0 || actions}
		<div class="border-t border-border/70">
			<div
				class="container-page flex flex-col gap-4 py-6 tablet:flex-row tablet:items-center tablet:justify-between"
			>
				<div class="flex flex-wrap items-center gap-touch-gap text-body-sm text-muted-foreground">
					{#if legalNote}<span>{legalNote}</span>{/if}
					{#each legalLinks as link, index (`${index}:${link.href ?? link.label}`)}
						{#if legalNote || index > 0}
							<span aria-hidden="true" class={index === 0 ? 'hidden tablet:inline' : undefined}
								>·</span
							>
						{/if}
						{@render footerLink(link)}
					{/each}
				</div>
				<div class="flex items-center gap-2">
					{@render actions?.()}
				</div>
			</div>
		</div>
	{/if}
</footer>
