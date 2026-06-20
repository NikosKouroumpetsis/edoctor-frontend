<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Textarea } from '$shared/ui/primitives/textarea';

	const { Story } = defineMeta({
		title: 'Primitives/Textarea',
		component: Textarea,
		tags: ['autodocs'],
		args: { placeholder: 'Write a message…', rows: 4, size: 'default', disabled: false },
		argTypes: {
			size: { control: 'select', options: ['sm', 'default', 'lg', 'xl'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-80"><Textarea aria-label="Message" {...args} /></div>
	{/snippet}
</Story>

<Story name="Invalid">
	{#snippet template()}
		<div class="w-80"><Textarea aria-invalid="true" aria-label="Message" value="Too short" /></div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="w-80"><Textarea disabled aria-label="Message" value="Disabled" /></div>
	{/snippet}
</Story>
