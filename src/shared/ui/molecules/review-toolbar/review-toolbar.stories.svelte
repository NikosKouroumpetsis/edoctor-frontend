<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ReviewToolbar } from '$shared/ui/molecules/review-toolbar';

	// U-66.1 Π6: the list's line: the count, the order, the round search that grows over the whole row.
	const { Story } = defineMeta({
		title: 'Molecules/ReviewToolbar',
		component: ReviewToolbar,
		tags: ['autodocs'],
		args: {
			count: '184 κριτικές',
			sortOptions: [
				{ value: 'newest', label: 'Πιο πρόσφατες' },
				{ value: 'oldest', label: 'Παλαιότερες' }
			],
			sortValue: 'newest',
			onSortChange: () => {},
			sortLabel: 'Ταξινόμηση κριτικών',
			searchLabel: 'Αναζήτηση στις κριτικές',
			searchCloseLabel: 'Κλείσιμο αναζήτησης',
			maxLength: 100
		}
	});
</script>

<Story name="Default" />

<Story name="Searching" args={{ searching: true, query: 'ευγενική' }} />
