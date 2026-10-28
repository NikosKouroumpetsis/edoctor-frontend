<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { DividerWithLabel } from '$shared/ui/molecules/divider-with-label';

	// The application's meta (`molecules/divider-with-label`).
	const { Story } = defineMeta({
		title: 'Molecules/DividerWithLabel',
		component: DividerWithLabel,
		tags: ['autodocs'],
		args: { label: 'ή' }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="max-w-form"><DividerWithLabel {...args} /></div>
	{/snippet}
</Story>

<Story name="Longer Label" args={{ label: 'ή συνεχίστε με' }}>
	{#snippet template(args)}
		<div class="max-w-form"><DividerWithLabel {...args} /></div>
	{/snippet}
</Story>
