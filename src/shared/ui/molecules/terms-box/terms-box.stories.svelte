<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { TermsBox } from '$shared/ui/molecules/terms-box';

	const { Story } = defineMeta({
		title: 'Molecules/TermsBox',
		component: TermsBox,
		tags: ['autodocs'],
		args: {
			title: 'Τώρα',
			lines: [
				{
					title: '«Ολοκληρώθηκε»',
					body: 'Γράφτηκε αυτόματα, γιατί δεν δηλώσατε έκβαση σε 24 ώρες.'
				},
				{
					title: 'Διορθώνεται ως Δευτέρα 16 Νοεμβρίου, 09:00',
					body: '48 ώρες μετά το τέλος της επίσκεψης.'
				}
			]
		}
	});
</script>

<Story name="Playground" />

<Story
	name="One Line"
	args={{
		title: 'Προθεσμία ακύρωσης',
		lines: [{ title: 'Έως την ώρα του ραντεβού', body: 'Ακυρώνετε από εδώ.' }]
	}}
/>

<Story name="In the dark theme" globals={{ theme: 'dark' }} />
