<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Textarea } from '$shared/ui/primitives/textarea';

	const sizes = ['sm', 'md', 'lg'] as const;

	// The application's meta (`atoms/textarea`): its `editable` is the web's `disabled`; every box is named.
	const { Story } = defineMeta({
		title: 'Primitives/Textarea',
		component: Textarea,
		tags: ['autodocs'],
		args: {
			placeholder: 'Γράψτε τα σχόλιά σας',
			'aria-label': 'Γράψτε τα σχόλιά σας',
			size: 'md',
			invalid: false,
			disabled: false
		},
		argTypes: {
			placeholder: { control: 'text' },
			size: { control: 'radio', options: sizes },
			invalid: { control: 'boolean' },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let value = $state('');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Textarea {...args} /></div>
	{/snippet}
</Story>

<Story name="Interactive">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Textarea {...args} bind:value /></div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-3">
			{#each sizes as size (size)}
				<Textarea {...args} {size} placeholder={size} aria-label={size} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story
	name="Invalid"
	args={{ invalid: true, placeholder: 'Υποχρεωτικό πεδίο', 'aria-label': 'Υποχρεωτικό πεδίο' }}
>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Textarea {...args} /></div>
	{/snippet}
</Story>

<Story
	name="Disabled"
	args={{ disabled: true, placeholder: 'Μη επεξεργάσιμο', 'aria-label': 'Μη επεξεργάσιμο' }}
>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Textarea {...args} /></div>
	{/snippet}
</Story>
