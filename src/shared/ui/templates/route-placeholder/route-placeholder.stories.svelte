<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoutePlaceholder from '$shared/ui/templates/route-placeholder';

	const { Story } = defineMeta({
		title: 'Templates/RoutePlaceholder',
		component: RoutePlaceholder,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: {
			eyebrow: 'Σύντομα',
			title: 'Κατάλογος ενοτήτων',
			body: 'Η ενότητα ετοιμάζεται. Στο μεταξύ μπορείτε να επιστρέψετε στην αρχική.',
			backHref: '#home',
			backLabel: 'Πίσω στην αρχική'
		}
	});
</script>

<!-- Screen-level template for not-yet-built routes; the caller gives the words, the back link and the tab title. -->
<Story name="Default">
	{#snippet template(args)}
		<RoutePlaceholder {...args} />
	{/snippet}
</Story>
