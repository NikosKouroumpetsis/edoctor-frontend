<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import type { NotificationFilterChoice } from '$modules/notifications/types';
	import type { NotificationInboxLinks } from '../types';

	let {
		title,
		filters,
		links,
		named
	}: {
		/** «Ειδοποιήσεις». */
		title: string;
		/** The three choices, the one on screen marked; «Νέες» with its count. */
		filters: NotificationFilterChoice[];
		links: NotificationInboxLinks;
		/** From 950 these rows are the page's choices: they carry its names for a test (the pills do below 950). */
		named: boolean;
	} = $props();
</script>

<!-- 🔴 U-174 · U-167 (record §5.8, `63-inbox/list.js` `side()`, `57-settings/set.css:15-17`): from 950 the list's three
     choices are the LEFT menu, the settings' own — the title 24 / 600 and rows of 48 with the 12 corner, the name 15; the
     one on screen on the grey pill, bold, `aria-current="page"`. Every row is a link that keeps the choice in the
     address. No colour under the pointer (U-100). The template shows this column from 950 only. -->
<div data-testid="notifications-menu">
	<h1 class="mb-4 ml-3.5 text-heading-md font-semibold text-foreground">{title}</h1>
	<nav aria-label={title} data-testid={named ? 'notifications-filters' : undefined}>
		<ul class="flex flex-col">
			{#each filters as choice (choice.id)}
				<li>
					<!-- The screen's address, already resolved (a module knows no route). -->
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={links.filter(choice.id)}
						aria-current={choice.selected ? 'page' : undefined}
						data-testid={named ? `notifications-filter-${choice.id}` : undefined}
						data-slot="notifications-menu-row"
						data-filter={choice.id}
						data-selected={choice.selected || undefined}
						class={cn(
							'flex min-h-touch w-full flex-row items-center rounded-md px-3.5 text-body-md text-foreground transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70',
							choice.selected && 'bg-chip font-semibold'
						)}
					>
						{choice.label}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</li>
			{/each}
		</ul>
	</nav>
</div>
