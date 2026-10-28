<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SearchTrigger } from '$shared/ui/molecules/search-trigger';

	const noop = () => {};

	// The application's meta (`molecules/search-trigger`): its words, its name, the canvas wide (U-09.9: the same
	// 68 pill as the application — 20 + the 28 line of the 16 semibold words + 20, the 20 glyph 12 from them). The
	// web pill hides from 744 by default, where `SearchBar` takes over; the shared examples keep it (`none`).
	const { Story } = defineMeta({
		title: 'Molecules/SearchTrigger',
		component: SearchTrigger,
		tags: ['autodocs'],
		args: {
			placeholder: 'Ξεκινήστε αναζήτηση γιατρού',
			'aria-label': 'Άνοιγμα αναζήτησης',
			hideFrom: 'none',
			onclick: noop
		},
		argTypes: {
			placeholder: { control: 'text' },
			title: { control: 'text' },
			subtitle: { control: 'text' },
			hideFrom: { control: 'select', options: ['tablet', 'none'] }
		}
	});
</script>

<Story name="Playground" />

<Story name="Without Press" args={{ onclick: undefined }} />

<!-- Two-line variant used by the search-results nav bar: a bold title over a muted subtitle, no icon. -->
<Story
	name="Two Line"
	args={{
		placeholder: undefined,
		title: 'Καρδιολόγος',
		subtitle: 'Αττική · Επόμενες 3 ημέρες',
		'aria-label': 'Άνοιγμα αναζήτησης γιατρού'
	}}
/>

<!-- Web only: the default `hideFrom="tablet"` — below 744 the pill (z375), from 744 `SearchBar` instead. -->
<Story
	name="Only Below Tablet"
	args={{ hideFrom: 'tablet' }}
	globals={{ viewport: { value: 'z375', isRotated: false } }}
/>
