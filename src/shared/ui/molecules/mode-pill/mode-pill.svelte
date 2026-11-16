<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		label,
		href,
		onclick,
		disabled = false,
		testId
	}: {
		/** The mode it leads to, already localized («Λειτουργία γιατρού»). */
		label: string;
		/** The mode's page before the scripts have run; `onclick` switches in place. */
		href?: string;
		onclick?: (event: MouseEvent) => void;
		/** A switch on its way takes no second press. */
		disabled?: boolean;
		testId?: string;
	} = $props();

	const pillClass =
		'fixed bottom-bar-bottom left-1/2 z-40 inline-flex min-h-touch min-w-touch -translate-x-1/2 flex-row items-center gap-2 rounded-full bg-foreground px-5.5 text-body-md font-semibold whitespace-nowrap text-card shadow-floating outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-80 disabled:opacity-60 tablet:hidden';
</script>

<!-- The switch between the two modes of an account (wave 5.1 · screens 64 / 76, Airbnb's «Λειτουργία φιλοξενίας»;
     `56-profile/prof.css:53-58` `.p-mode`): the dark pill over the tab bar, ⇄ and its words, only below 744 (from 744
     the bar and its menu have it). No colour under the pointer (U-100). -->
{#if href}
	<!-- The caller's address, already resolved in the page's language. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a {href} {onclick} data-slot="mode-pill" data-testid={testId} class={pillClass}>
		<Ionicon name="swap-horizontal-outline" class="icon-md shrink-0" />
		{label}
	</a>
{:else}
	<button
		type="button"
		{onclick}
		{disabled}
		data-slot="mode-pill"
		data-testid={testId}
		class={pillClass}
	>
		<Ionicon name="swap-horizontal-outline" class="icon-md shrink-0" />
		{label}
	</button>
{/if}
