<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { TextButton } from '$shared/ui/primitives/text-button';

	const tones = ['foreground', 'primary', 'muted', 'danger'] as const;

	// The application's meta (`atoms/text-button`).
	const { Story } = defineMeta({
		title: 'Primitives/TextButton',
		component: TextButton,
		tags: ['autodocs'],
		args: { label: 'Ξέχασα τον κωδικό μου', tone: 'primary', underline: false },
		argTypes: {
			tone: { control: 'select', options: tones },
			underline: { control: 'boolean' },
			label: { control: 'text' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<TextButton {...args} />
	{/snippet}
</Story>

<Story name="Tones">
	{#snippet template(args)}
		<div class="flex flex-col items-start gap-3">
			{#each tones as tone (tone)}
				<TextButton {...args} {tone} label={tone} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Underlined" args={{ underline: true, label: 'Όροι χρήσης' }}>
	{#snippet template(args)}
		<TextButton {...args} />
	{/snippet}
</Story>

<!-- A text role in `textClass` and no tone: the label wears the foreground. -->
<Story
	name="With Text Role"
	args={{ label: 'Δείτε όλους', textClass: 'text-label-md', tone: undefined, underline: true }}
>
	{#snippet template(args)}
		<TextButton {...args} />
	{/snippet}
</Story>
