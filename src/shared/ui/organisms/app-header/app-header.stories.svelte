<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { AppHeader } from '$shared/ui/organisms/app-header';
	import { SplitView } from '$shared/ui/templates/split-view';
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

{#snippet sideColumn()}
	<div class="p-gutter-sm split:pl-6 laptop:pl-pane-inset">
		<h1 class="text-heading-md font-semibold text-foreground">Λίστα</h1>
		<p class="mt-3 text-body-md text-muted-foreground">Η λίστα ξεκινά κάτω από το σήμα.</p>
	</div>
{/snippet}

<!-- U-215.3 (D-W52-12), `frame="box"`: the default, apple.com's 1024 in the middle whatever the page. -->
<Story name="Frame: Box" globals={at('z1920')}>
	{#snippet template()}
		<AppHeader {brand} {nav} {actions} frame="box" />
	{/snippet}
</Story>

<!-- `frame="page"`: always the page's frame — 24 from the edges, 48 from 1128, the links in the exact middle. -->
<Story name="Frame: Page" globals={at('z1920')}>
	{#snippet template()}
		<AppHeader {brand} {nav} {actions} frame="page" />
	{/snippet}
</Story>

<Story name="Frame: Page At 950" globals={at('z950')}>
	{#snippet template()}
		<AppHeader {brand} {nav} {actions} frame="page" />
	{/snippet}
</Story>

<!-- `frame="split-page"`: the page's frame because the page stands on a `SplitView` — the mark over the side column. -->
<Story name="Frame: Split Page, With A Side Column" globals={at('z1920')}>
	{#snippet template()}
		<AppHeader {brand} {nav} {actions} frame="split-page" />
		<SplitView list={sideColumn}>
			<p class="p-gutter-sm text-body-md text-foreground">Ό,τι άνοιξε η λίστα.</p>
		</SplitView>
	{/snippet}
</Story>

<!-- … and without one, the same bar is the 1024 box. -->
<Story name="Frame: Split Page, Without A Side Column" globals={at('z1920')}>
	{#snippet template()}
		<AppHeader {brand} {nav} {actions} frame="split-page" />
	{/snippet}
</Story>

<!-- From 744 only (U-16.3): the phone has no top bar at all. -->
<Story name="From the tablet" globals={at('z744')}>
	{#snippet template()}
		<AppHeader {brand} {nav} {actions} showFrom="tablet" />
	{/snippet}
</Story>
