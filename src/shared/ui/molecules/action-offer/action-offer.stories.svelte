<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ActionOffer } from '$shared/ui/molecules/action-offer';

	const { Story } = defineMeta({
		title: 'Molecules/ActionOffer',
		component: ActionOffer,
		tags: ['autodocs'],
		args: {
			title: 'Θέλετε απλώς άλλη ώρα;',
			body: 'Αλλάξτε την ώρα και το ραντεβού μένει.',
			action: 'Αλλαγή ώρας',
			href: '#',
			onOpen: () => {}
		}
	});
</script>

<Story name="Playground" />

<Story name="Long Words" args={{ body: 'Αλλάξτε την ώρα και το ραντεβού επιβεβαιώνεται.' }} />
