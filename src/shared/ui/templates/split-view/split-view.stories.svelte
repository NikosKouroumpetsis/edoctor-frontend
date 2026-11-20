<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';
	import { SplitView, SplitViewFoldButton } from '$shared/ui/templates/split-view';

	const rows = [
		'Πρώτη γραμμή',
		'Δεύτερη γραμμή',
		'Τρίτη γραμμή',
		'Τέταρτη γραμμή',
		'Πέμπτη γραμμή'
	];

	const railIcons: IoniconName[] = ['apps-outline', 'archive-outline', 'list-outline'];

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

{#snippet menu()}
	<h1 class="mb-4 text-heading-md font-semibold text-foreground">Μενού</h1>
	<ul class="flex flex-col">
		{#each rows as row, index (row)}
			<li
				class={index === 0
					? 'flex min-h-touch items-center rounded-md bg-chip px-3.5 text-body-md font-semibold text-foreground'
					: 'flex min-h-touch items-center rounded-md px-3.5 text-body-md text-foreground'}
			>
				{row}
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet section()}
	<h2 class="text-heading-md font-semibold text-foreground">Πρώτη γραμμή</h2>
	{#each rows as row (row)}
		<p class="border-b border-line py-5 text-body-md text-foreground">{row}</p>
	{/each}
{/snippet}

<!-- A menu that folds (U-216.2): its title and the fold button in one row, the rows under them. -->
{#snippet foldingMenu()}
	<div class="mb-4 flex flex-row items-center gap-3">
		<h1 class="text-heading-md font-semibold text-foreground">Μενού</h1>
		<SplitViewFoldButton label="Σύμπτυξη του μενού" class="ml-auto" />
	</div>
	<ul class="flex flex-col">
		{#each rows as row, index (row)}
			<li
				class={index === 0
					? 'flex min-h-touch items-center rounded-md bg-chip px-3.5 text-body-md font-semibold text-foreground'
					: 'flex min-h-touch items-center rounded-md px-3.5 text-body-md text-foreground'}
			>
				{row}
			</li>
		{/each}
	</ul>
{/snippet}

<!-- … and its rail: the button that opens it again, then one icon for each section (the chosen one on `bg-chip`). -->
{#snippet foldedRail()}
	<SplitViewFoldButton label="Άνοιγμα του μενού" />
	<ul class="flex flex-col gap-2">
		{#each railIcons as icon, index (icon)}
			<li>
				<a
					href="#section"
					aria-label={rows[index]}
					aria-current={index === 0 ? 'page' : undefined}
					class={index === 0
						? 'grid size-touch place-items-center rounded-md bg-chip text-foreground'
						: 'grid size-touch place-items-center rounded-md text-foreground'}
				>
					<Ionicon name={icon} class="icon-md" />
				</a>
			</li>
		{/each}
	</ul>
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

<!-- U-167 (D-W45-08): a menu of 340 / 420 on the left, what it opened in the MIDDLE of the right column (at most 640). -->
<Story name="Menu And Centred Pane" globals={{ viewport: { value: 'z1440' } }}>
	{#snippet template()}
		<SplitView list={menu} widths="menu" centred>{@render section()}</SplitView>
	{/snippet}
</Story>

<Story name="Menu And Centred Pane At 950" globals={{ viewport: { value: 'z950' } }}>
	{#snippet template()}
		<SplitView list={menu} widths="menu" centred>{@render section()}</SplitView>
	{/snippet}
</Story>

<!-- 🔴 U-215.3 (D-W52-11, D-W52-13): the page's frame — at 1920 the menu's column is 30 % of it (576) and the menu of
     324 stands in the middle of that column; wider than 1920 the whole stays 1920, centred. -->
<Story name="Menu, Wide Frame" globals={{ viewport: { value: 'z1920' } }}>
	{#snippet template()}
		<SplitView list={menu} widths="menu" centred>{@render section()}</SplitView>
	{/snippet}
</Story>

<!-- U-216.2 (D-W52-14): the menu folds to a rail of its icons and opens again — the column glides, the menu leaves
     before the rail arrives, the section re-centres in the room it gets. Press the button. -->
<Story name="Menu, Folding" globals={{ viewport: { value: 'z1440' } }}>
	{#snippet template()}
		<SplitView list={foldingMenu} rail={foldedRail} widths="menu" centred>
			{@render section()}
		</SplitView>
	{/snippet}
</Story>

<Story name="Menu, Folding, Folded At 950" globals={{ viewport: { value: 'z950' } }}>
	{#snippet template()}
		<SplitView list={foldingMenu} rail={foldedRail} folded widths="menu" centred>
			{@render section()}
		</SplitView>
	{/snippet}
</Story>

<!-- D-W51-36: `from="laptop"` — one column up to 1127 (the list, or what it opened), both side by side from 1128. -->
<Story name="From 1128, At 1440" globals={{ viewport: { value: 'z1440' } }}>
	{#snippet template()}
		<SplitView list={column} from="laptop" centred>{@render detail()}</SplitView>
	{/snippet}
</Story>

<Story name="From 1128, At 950" globals={{ viewport: { value: 'z950' } }}>
	{#snippet template()}
		<SplitView list={column} from="laptop" centred>{@render detail()}</SplitView>
	{/snippet}
</Story>
