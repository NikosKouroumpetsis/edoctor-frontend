<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Breadcrumbs } from '$shared/ui/molecules/breadcrumbs';

	// U-77: the steps over a page from 744; the last one is the page itself.
	const { Story } = defineMeta({
		title: 'Molecules/Breadcrumbs',
		component: Breadcrumbs,
		tags: ['autodocs'],
		args: {
			label: 'Διαδρομή',
			crumbs: [
				{ label: 'Γιατροί', href: '#' },
				{ label: 'Δρ. Αθηνά Παπαδοπούλου', href: '#' },
				{ label: 'Άρθρα · Συμβουλές υγείας' }
			]
		}
	});
</script>

<Story name="Default" />
