<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BottomNav from '$shared/ui/organisms/bottom-nav';
	import { sampleBottomNavItems } from './bottom-nav.sample';

	const { Story } = defineMeta({
		title: 'Organisms/BottomNav',
		component: BottomNav,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { items: sampleBottomNavItems, 'aria-label': 'Πλοήγηση', hideFrom: 'tablet' },
		argTypes: { hideFrom: { control: 'select', options: ['tablet', 'split', 'laptop', 'desktop'] } }
	});
</script>

<!-- The caller gives the tabs (the shell module for the product): the floating glass capsule over the page, which
     shows through it; it hides from `hideFrom` up. -->
<Story name="Default">
	{#snippet template(args)}
		<div class="relative flex min-h-sheet-sm w-full flex-col gap-3 bg-background p-6">
			<div class="h-card-rail-media rounded-lg bg-primary"></div>
			<div class="h-card-rail-media rounded-lg bg-accent"></div>
			<BottomNav {...args} />
		</div>
	{/snippet}
</Story>

<!-- The same capsule on the dark theme: the dark card at 50 % with its own rim. -->
<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template(args)}
		<div class="relative flex min-h-sheet-sm w-full flex-col gap-3 bg-background p-6">
			<div class="h-card-rail-media rounded-lg bg-primary"></div>
			<BottomNav {...args} />
		</div>
	{/snippet}
</Story>
