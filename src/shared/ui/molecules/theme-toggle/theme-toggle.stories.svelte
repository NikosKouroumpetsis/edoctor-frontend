<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ThemeToggle from '$shared/ui/molecules/theme-toggle';

	const { Story } = defineMeta({
		title: 'Molecules/Theme toggle',
		component: ThemeToggle,
		tags: ['autodocs']
	});
</script>

<!-- Note: also driven by the global Theme toolbar; this button flips the app's own `.dark` class. -->
<Story name="Default">
	{#snippet template()}
		<ThemeToggle />
	{/snippet}
</Story>
