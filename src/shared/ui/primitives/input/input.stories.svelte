<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Input } from '$shared/ui/primitives/input';

	const { Story } = defineMeta({
		title: 'Primitives/Input',
		component: Input,
		tags: ['autodocs'],
		args: { placeholder: 'Type here…', size: 'default', disabled: false },
		argTypes: {
			type: {
				control: 'select',
				options: ['text', 'email', 'password', 'number', 'file']
			},
			size: { control: 'select', options: ['sm', 'default', 'lg', 'xl'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-72"><Input aria-label="Example" {...args} /></div>
	{/snippet}
</Story>

<Story name="Types">
	{#snippet template()}
		<div class="flex w-72 flex-col gap-3">
			<Input type="text" placeholder="Text" aria-label="Text" />
			<Input type="email" placeholder="Email" aria-label="Email" />
			<Input type="password" placeholder="Password" aria-label="Password" />
			<Input type="file" aria-label="File" />
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex w-72 flex-col gap-3">
			<Input size="sm" placeholder="sm" aria-label="sm" />
			<Input size="default" placeholder="default" aria-label="default" />
			<Input size="lg" placeholder="lg" aria-label="lg" />
			<Input size="xl" placeholder="xl" aria-label="xl" />
		</div>
	{/snippet}
</Story>

<Story name="Invalid">
	{#snippet template()}
		<div class="w-72"><Input aria-invalid="true" value="not-an-email" aria-label="Email" /></div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="w-72"><Input disabled value="Disabled" aria-label="Disabled" /></div>
	{/snippet}
</Story>
