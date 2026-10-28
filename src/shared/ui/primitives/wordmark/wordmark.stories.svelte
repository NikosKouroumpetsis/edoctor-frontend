<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Wordmark } from '$shared/ui/primitives/wordmark';

	const { Story } = defineMeta({
		title: 'Primitives/Wordmark',
		component: Wordmark,
		tags: ['autodocs'],
		args: { as: 'p' }
	});
</script>

<Story name="Default">
	{#snippet template(args)}
		<div class="flex justify-center"><Wordmark {...args} /></div>
	{/snippet}
</Story>
