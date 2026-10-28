<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Progress } from '$shared/ui/primitives/progress';

	const tones = ['primary', 'accent', 'success', 'warning', 'danger'] as const;
	const sizes = ['sm', 'md'] as const;

	// The application's meta (`atoms/progress`); the web names each bar for assistive tech.
	const { Story } = defineMeta({
		title: 'Primitives/Progress',
		component: Progress,
		tags: ['autodocs'],
		args: { value: 60, max: 100, tone: 'primary', size: 'md', 'aria-label': 'Πρόοδος' },
		argTypes: {
			value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
			tone: { control: 'select', options: tones },
			size: { control: 'radio', options: sizes }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Progress {...args} /></div>
	{/snippet}
</Story>

<Story name="Tones">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-3">
			{#each tones as tone (tone)}
				<Progress {...args} {tone} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Steps">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-3">
			{#each [0, 25, 50, 75, 100] as value (value)}
				<Progress {...args} {value} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-3">
			{#each sizes as size (size)}
				<Progress {...args} {size} />
			{/each}
		</div>
	{/snippet}
</Story>
