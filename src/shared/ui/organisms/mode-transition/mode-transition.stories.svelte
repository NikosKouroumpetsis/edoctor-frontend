<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ModeTransition } from '$shared/ui/organisms/mode-transition';

	const { Story } = defineMeta({
		title: 'Organisms/ModeTransition',
		component: ModeTransition,
		tags: ['autodocs'],
		args: { open: true, label: 'Μετάβαση στη λειτουργία γιατρού' }
	});
</script>

{#snippet mark()}
	<span
		class="grid size-control-xl place-items-center rounded-lg bg-primary text-heading-md font-bold text-primary-foreground"
		>e+</span
	>
{/snippet}

<Story name="Playground">
	{#snippet template(args)}
		<ModeTransition {...args} {mark} />
	{/snippet}
</Story>

<Story name="Towards the patient">
	{#snippet template()}
		<ModeTransition open label="Μετάβαση στη λειτουργία ασθενή" {mark} />
	{/snippet}
</Story>
