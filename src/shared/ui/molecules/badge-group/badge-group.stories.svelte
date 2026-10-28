<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { BadgeGroup } from '$shared/ui/molecules/badge-group';

	const many = [
		'Μετρητά',
		'Κάρτα',
		'Τραπεζική μεταφορά',
		'Ψηφιακό πορτοφόλι',
		'Δόσεις',
		'Επιταγή',
		'Κουπόνι'
	].map((label, index) => ({ id: `${index}`, label }));

	// The application's meta (`molecules/badge-group`).
	const { Story } = defineMeta({
		title: 'Molecules/BadgeGroup',
		component: BadgeGroup,
		tags: ['autodocs'],
		args: {
			items: [
				{ id: 'cash', label: 'Μετρητά' },
				{ id: 'card', label: 'Κάρτα' },
				{ id: 'transfer', label: 'Τραπεζική μεταφορά' }
			],
			title: 'Τρόποι πληρωμής'
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<BadgeGroup {...args} />
	{/snippet}
</Story>

<!-- Many items wrap onto as many rows as they need. -->
<Story name="Wrapping" args={{ items: many }}>
	{#snippet template(args)}
		<BadgeGroup {...args} />
	{/snippet}
</Story>

<Story name="One Item" args={{ items: [{ id: 'cash', label: 'Μετρητά' }] }}>
	{#snippet template(args)}
		<BadgeGroup {...args} />
	{/snippet}
</Story>
