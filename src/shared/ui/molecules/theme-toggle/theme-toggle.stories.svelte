<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ThemeToggle from '$shared/ui/molecules/theme-toggle';

	const { Story } = defineMeta({
		title: 'Molecules/ThemeToggle',
		component: ThemeToggle,
		tags: ['autodocs'],
		args: { lightLabel: 'Φωτεινό θέμα', darkLabel: 'Σκούρο θέμα' }
	});
</script>

<!-- Note: also driven by the global Theme toolbar; this button flips the app's own `.dark` class. -->
<Story name="Default">
	{#snippet template(args)}
		<ThemeToggle {...args} />
	{/snippet}
</Story>
