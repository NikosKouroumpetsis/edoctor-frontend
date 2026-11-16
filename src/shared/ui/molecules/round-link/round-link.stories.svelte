<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { RoundLink } from '$shared/ui/molecules/round-link';

	const { Story } = defineMeta({
		title: 'Molecules/RoundLink',
		component: RoundLink,
		tags: ['autodocs'],
		args: { href: '#', label: 'Πίσω', icon: 'arrow-back' }
	});
</script>

<Story name="Playground" />

<Story name="Chevron" args={{ icon: 'chevron-back' }} />

<Story
	name="Close Below 744"
	args={{ icon: 'close', label: 'Κλείσιμο', wideIcon: 'arrow-back', wideLabel: 'Πίσω' }}
/>
