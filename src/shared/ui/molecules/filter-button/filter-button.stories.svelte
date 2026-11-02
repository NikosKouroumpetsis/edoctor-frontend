<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { FilterButton } from '$shared/ui/molecules/filter-button';

	// U-24.2: the results' filters button — the phone's circle beside the summary pill, the web's pill from 744.
	const { Story } = defineMeta({
		title: 'Molecules/FilterButton',
		component: FilterButton,
		tags: ['autodocs'],
		args: { label: 'Φίλτρα', 'aria-label': 'Φίλτρα', shape: 'circle', count: 0 },
		argTypes: {
			shape: { control: 'inline-radio', options: ['circle', 'pill'] },
			count: { control: { type: 'number', min: 0 } }
		}
	});
</script>

<Story name="Circle" />

<!-- Two filters set: the 2 dark ring and the badge. -->
<Story name="Circle Active" args={{ count: 2, 'aria-label': 'Φίλτρα, 2 ενεργά φίλτρα' }} />

<Story name="Pill" args={{ shape: 'pill' }} />

<Story
	name="Pill Active"
	args={{ shape: 'pill', count: 2, 'aria-label': 'Φίλτρα, 2 ενεργά φίλτρα' }}
/>
