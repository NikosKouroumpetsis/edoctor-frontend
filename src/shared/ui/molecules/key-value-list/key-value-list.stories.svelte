<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { KeyValueList } from '$shared/ui/molecules/key-value-list';

	const items = [
		{ id: 'what', label: 'Τι', value: 'Οποιαδήποτε κατηγορία' },
		{ id: 'where', label: 'Πού', value: 'Αθήνα' },
		{ id: 'when', label: 'Πότε', value: 'Οποτεδήποτε' }
	];

	const { Story } = defineMeta({
		title: 'Molecules/KeyValueList',
		component: KeyValueList,
		tags: ['autodocs'],
		args: { items, title: 'Κριτήρια αναζήτησης' }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><KeyValueList {...args} /></div>
	{/snippet}
</Story>

<Story name="Without a title">
	{#snippet template()}
		<div class="w-full max-w-form"><KeyValueList {items} /></div>
	{/snippet}
</Story>

<Story
	name="A long value cut on one line"
	globals={{ viewport: { value: 'z375', isRotated: false } }}
>
	{#snippet template()}
		<KeyValueList
			items={[
				{
					id: 'where',
					label: 'Πού',
					value: 'Περιφερειακή Ενότητα Ανατολικής Αττικής, Δήμος Μαραθώνος'
				}
			]}
		/>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="w-full max-w-form bg-background p-card">
			<KeyValueList {items} title="Κριτήρια αναζήτησης" />
		</div>
	{/snippet}
</Story>
