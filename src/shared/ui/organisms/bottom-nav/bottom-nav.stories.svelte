<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BottomNav from '$shared/ui/organisms/bottom-nav';
	import { sampleBottomNavItems } from './bottom-nav.sample';

	const { Story } = defineMeta({
		title: 'Organisms/BottomNav',
		component: BottomNav,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { items: sampleBottomNavItems, 'aria-label': 'Πλοήγηση', hideFrom: 'laptop' },
		argTypes: { hideFrom: { control: 'select', options: ['tablet', 'split', 'laptop', 'desktop'] } }
	});
</script>

<!-- The caller gives the tabs (the shell module for the product); it hides from `hideFrom` up. -->
<Story name="Default">
	{#snippet template(args)}
		<div class="relative h-bar-bottom w-full overflow-hidden bg-background">
			<BottomNav {...args} />
		</div>
	{/snippet}
</Story>
