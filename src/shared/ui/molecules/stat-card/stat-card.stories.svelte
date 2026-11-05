<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StatCard } from '$shared/ui/molecules/stat-card';

	// U-72.3 Π3: the figures of a page, in equal cells; they stack when a word does not fit.
	const { Story } = defineMeta({
		title: 'Molecules/StatCard',
		component: StatCard,
		tags: ['autodocs'],
		args: {
			label: 'Με μια ματιά',
			cells: [
				{ id: 'a', value: '3', label: 'Τομείς εξειδίκευσης' },
				{ id: 'b', value: '37', label: 'Επισκέψεις' },
				{ id: 'c', value: '13', label: 'Χρόνια εμπειρίας' }
			]
		}
	});
</script>

<Story name="Default" />
