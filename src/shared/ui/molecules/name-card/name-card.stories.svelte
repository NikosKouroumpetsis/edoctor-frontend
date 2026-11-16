<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { NameCard } from '$shared/ui/molecules/name-card';

	const { Story } = defineMeta({
		title: 'Molecules/NameCard',
		component: NameCard,
		tags: ['autodocs'],
		args: { initial: 'Ε', title: 'Ελένη Παππά', line: 'e***a@example.gr' }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><NameCard {...args} /></div>
	{/snippet}
</Story>

<Story name="A doctor’s specialty">
	{#snippet template()}
		<div class="w-full max-w-form">
			<NameCard initial="Ε" title="Ελένη Παππά" line="Καρδιολόγος" />
		</div>
	{/snippet}
</Story>

<Story name="No name known">
	{#snippet template()}
		<div class="w-full max-w-form"><NameCard initial={null} title={null} line={null} /></div>
	{/snippet}
</Story>
