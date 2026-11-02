<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { AppHeader } from '$shared/ui/organisms/app-header';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	const { Story } = defineMeta({
		title: 'Organisms/AppHeader',
		component: AppHeader,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});

	const at = (value: string) => ({ viewport: { value, isRotated: false } });

	const linkClass =
		'inline-flex min-h-touch min-w-touch items-center justify-center px-2 text-body-sm text-foreground/80';
</script>

{#snippet brand()}
	<a href="#home" class="inline-flex min-h-touch min-w-touch items-center font-semibold">Δείγμα</a>
{/snippet}

{#snippet nav()}
	<nav class="flex flex-row items-center justify-around" aria-label="Κύρια πλοήγηση">
		<a href="#a" class={linkClass}>Ενότητα Α</a>
		<a href="#b" class={linkClass}>Ενότητα Β</a>
	</nav>
{/snippet}

{#snippet compact()}
	<button
		type="button"
		class="inline-flex min-h-touch min-w-touch items-center gap-2 rounded-full border border-border bg-card px-4 text-body-sm font-semibold shadow-raised"
	>
		Αναζήτηση
		<Ionicon name="search" class="icon-sm" />
	</button>
{/snippet}

{#snippet actions()}
	<button
		type="button"
		aria-label="Μενού"
		class="inline-flex min-h-touch min-w-touch items-center justify-center rounded-full"
	>
		<Ionicon name="menu" class="icon-md" />
	</button>
{/snippet}

<!-- apple.com's bar: the mark, the links in the middle, the menu at the end; frosted, 64 high. -->
<Story name="Default" globals={at('z1128')}>
	{#snippet template()}
		<AppHeader {brand} {nav} {actions} />
	{/snippet}
</Story>

<!-- The page's search went under the bar: the links give way to its pill (Airbnb's), in the same place. -->
<Story name="Compact" globals={at('z1128')}>
	{#snippet template()}
		<AppHeader {brand} {nav} {compact} compactOn {actions} />
	{/snippet}
</Story>

<!-- From 744 only (U-16.3): the phone has no top bar at all. -->
<Story name="From the tablet" globals={at('z744')}>
	{#snippet template()}
		<AppHeader {brand} {nav} {actions} showFrom="tablet" />
	{/snippet}
</Story>
