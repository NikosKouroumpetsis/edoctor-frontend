<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SearchSummaryBar } from '$shared/ui/molecules/search-summary-bar';

	const noop = () => {};

	// The application's meta (`molecules/search-summary-bar`).
	const { Story } = defineMeta({
		title: 'Molecules/SearchSummaryBar',
		component: SearchSummaryBar,
		tags: ['autodocs'],
		args: {
			backLabel: 'Πίσω',
			filtersLabel: 'Φίλτρα',
			onBack: noop,
			onOpenFilters: noop,
			onOpenSearch: noop,
			openLabel: 'Αλλαγή αναζήτησης',
			subtitle: 'Αττική · Επόμενες 3 ημέρες',
			title: 'Οποιοδήποτε'
		},
		argTypes: { filterCount: { control: { type: 'number', min: 0 } } }
	});
</script>

<Story name="Playground" />

<!-- Two filters set: the filters button wears the ring and the count. -->
<Story name="With Filters" args={{ filterCount: 2, filtersLabel: '2 ενεργά φίλτρα' }} />

<!-- A long search: each line of the pill stays on one line. -->
<Story
	name="Long Search"
	args={{
		subtitle: 'Περιφερειακή Ενότητα Δυτικής Αθήνας · Οποιαδήποτε ημερομηνία',
		title: 'Ειδικότητα με ένα πολύ μεγάλο όνομα'
	}}
/>
