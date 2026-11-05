<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ListRow } from '$shared/ui/molecules/list-row';

	// U-70 Π5: a row of a list: a link («›»), or one that opens in its place («⌄»); the facts by the row's own width.
	const { Story } = defineMeta({
		title: 'Molecules/ListRow',
		component: ListRow,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let expanded = $state(true);
</script>

{#snippet glyph()}
	<Ionicon name="medkit-outline" class="icon-lg" />
{/snippet}
{#snippet meta()}
	<span>30΄</span>
	<span aria-hidden="true">·</span>
	<span class="text-foreground">40 €</span>
{/snippet}
{#snippet end()}
	<span class="text-body-lg font-semibold text-foreground">40 €</span>
	<span class="text-body-sm text-muted-foreground">30΄</span>
{/snippet}
{#snippet body()}
	<p class="pb-6 pl-control-sm text-body-lg text-foreground">Το κείμενο της γραμμής.</p>
{/snippet}

<Story name="Opens in place">
	{#snippet template()}
		<ListRow
			title="Απλή επίσκεψη"
			subtitle="Εξέταση και συνταγή, αν χρειαστεί"
			leading={glyph}
			{meta}
			{end}
			{expanded}
			onToggle={() => (expanded = !expanded)}
			{body}
		/>
	{/snippet}
</Story>

<Story name="A link">
	{#snippet template()}
		<ListRow title="Απλή επίσκεψη" subtitle="Εξέταση" leading={glyph} {meta} {end} href="#row" />
	{/snippet}
</Story>

<Story name="A head">
	{#snippet template()}
		<ListRow title="Απλή επίσκεψη" size="lg" titleAs="h3" leading={glyph} {meta} {end} />
	{/snippet}
</Story>
