<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SplitView } from '$shared/ui/templates/split-view';

	const rows = [
		'Πρώτη γραμμή',
		'Δεύτερη γραμμή',
		'Τρίτη γραμμή',
		'Τέταρτη γραμμή',
		'Πέμπτη γραμμή'
	];

	// D-W4-52 (the inbox's two columns): below 950 the list, or what it opened; from 950 both, each scrolling on its own;
	// U-139.1: nothing for the right ⇒ one column in the middle.
	const { Story } = defineMeta({
		title: 'Templates/SplitView',
		component: SplitView,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet column()}
	<div class="flex flex-col gap-3 p-gutter-sm">
		<h1 class="text-heading-md font-semibold text-foreground">Λίστα</h1>
		{#each rows as row, index (row)}
			<div
				class={index === 0
					? 'rounded-xl border-2 border-foreground p-card text-body-lg text-foreground'
					: 'rounded-xl border border-border/60 p-card text-body-lg text-foreground'}
			>
				{row}
			</div>
		{/each}
	</div>
{/snippet}

{#snippet detail()}
	<div class="flex flex-col gap-section p-gutter-sm split:px-section">
		<h2 class="text-heading-md font-semibold text-foreground">Πρώτη γραμμή</h2>
		{#each rows as row (row)}
			<div class="h-card-list-media rounded-xl bg-muted"></div>
		{/each}
	</div>
{/snippet}

{#snippet state()}
	<div class="flex flex-col items-center gap-3 p-gutter-sm text-center">
		<h1 class="text-heading-md font-semibold text-foreground">Λίστα</h1>
		<p class="text-body-lg text-muted-foreground">Δεν υπάρχει τίποτα ακόμα.</p>
	</div>
{/snippet}

<Story name="List And Pane" globals={{ viewport: { value: 'z1440' } }}>
	{#snippet template()}
		<SplitView list={column}>{@render detail()}</SplitView>
	{/snippet}
</Story>

<!-- Below 950 the right column shows instead of the list; the list stays in the page, hidden. -->
<Story name="Open On The Phone" globals={{ viewport: { value: 'z375' } }}>
	{#snippet template()}
		<SplitView list={column} open>{@render detail()}</SplitView>
	{/snippet}
</Story>

<Story name="List On The Phone" globals={{ viewport: { value: 'z375' } }}>
	{#snippet template()}
		<SplitView list={column}>{@render detail()}</SplitView>
	{/snippet}
</Story>

<!-- U-139.1: an empty list, a wait or an error — one column in the middle from 950, never beside an empty side. -->
<Story name="Solo" globals={{ viewport: { value: 'z1440' } }}>
	{#snippet template()}
		<SplitView list={state} solo>{@render detail()}</SplitView>
	{/snippet}
</Story>

<Story name="Inbox Widths" globals={{ viewport: { value: 'z1128' } }}>
	{#snippet template()}
		<SplitView list={column} widths="inbox">{@render detail()}</SplitView>
	{/snippet}
</Story>
