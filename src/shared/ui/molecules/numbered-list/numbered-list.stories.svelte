<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { NumberedList } from '$shared/ui/molecules/numbered-list';

	const items = [
		'Πτυχίο Ιατρικής, Εθνικό και Καποδιστριακό Πανεπιστήμιο Αθηνών',
		'Ειδικότητα Καρδιολογίας, Γενικό Νοσοκομείο Αθηνών',
		'Μεταπτυχιακό στην Επεμβατική Καρδιολογία'
	];

	const { Story } = defineMeta({
		title: 'Molecules/NumberedList',
		component: NumberedList,
		tags: ['autodocs'],
		args: { title: 'Σπουδές', count: '(3)', items, linkLabel: 'Εμφάνιση όλων', onLink: () => {} }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><NumberedList {...args} /></div>
	{/snippet}
</Story>

<Story name="Without a count">
	{#snippet template()}
		<div class="w-full max-w-form">
			<NumberedList title="Σπουδές" {items} linkLabel="Εμφάνιση όλων" linkHref="#studies" />
		</div>
	{/snippet}
</Story>

<Story name="Without a link">
	{#snippet template()}
		<div class="w-full max-w-form"><NumberedList title="Σπουδές" count="(3)" {items} /></div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="w-full max-w-form bg-background p-card">
			<NumberedList
				title="Σπουδές"
				count="(3)"
				{items}
				linkLabel="Εμφάνιση όλων"
				onLink={() => {}}
			/>
		</div>
	{/snippet}
</Story>
