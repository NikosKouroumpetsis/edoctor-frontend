<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { BulletList } from '$shared/ui/molecules/bullet-list';

	const { Story } = defineMeta({
		title: 'Molecules/BulletList',
		component: BulletList,
		tags: ['autodocs'],
		args: {
			items: [
				'Ο ασθενής ενημερώνεται αμέσως και βλέπει τον λόγο και το μήνυμά σας.',
				'Η ώρα ελευθερώνεται για άλλους ασθενείς.',
				'Η απόρριψη δεν αναιρείται.'
			]
		}
	});
</script>

<Story name="Playground" />

<Story name="One Line" args={{ items: ['Η ακύρωση δεν αναιρείται.'] }} />
