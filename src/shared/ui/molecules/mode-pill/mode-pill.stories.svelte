<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ModePill } from '$shared/ui/molecules/mode-pill';

	const { Story } = defineMeta({
		title: 'Molecules/ModePill',
		component: ModePill,
		tags: ['autodocs'],
		args: { label: 'Λειτουργία γιατρού', href: '#doctor' }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<ModePill {...args} />
	{/snippet}
</Story>

<Story name="Towards the patient">
	{#snippet template()}
		<ModePill label="Λειτουργία ασθενή" onclick={() => {}} />
	{/snippet}
</Story>
