<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { FormField } from '$shared/ui/molecules/form-field';
	import { Input } from '$shared/ui/primitives/input';

	// The application's meta (`molecules/form-field`); the control is the `children` snippet, wired by its argument.
	const { Story } = defineMeta({
		title: 'Molecules/FormField',
		component: FormField,
		tags: ['autodocs'],
		args: {
			label: 'Email',
			helperText: 'Δεν θα κοινοποιηθεί ποτέ.',
			required: false,
			disabled: false
		},
		argTypes: {
			label: { control: 'text' },
			helperText: { control: 'text' },
			error: { control: 'text' },
			required: { control: 'boolean' },
			disabled: { control: 'boolean' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<FormField {...args}>
				{#snippet children(control)}<Input {...control} placeholder="name@example.com" />{/snippet}
			</FormField>
		</div>
	{/snippet}
</Story>

<Story name="Required" args={{ required: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<FormField {...args}>
				{#snippet children(control)}<Input {...control} placeholder="name@example.com" />{/snippet}
			</FormField>
		</div>
	{/snippet}
</Story>

<Story name="With Error" args={{ error: 'Δώσε ένα έγκυρο email.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<FormField {...args}>
				{#snippet children(control)}<Input {...control} placeholder="name@example.com" />{/snippet}
			</FormField>
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<FormField {...args}>
				{#snippet children(control)}<Input
						{...control}
						disabled
						placeholder="Μη επεξεργάσιμο"
					/>{/snippet}
			</FormField>
		</div>
	{/snippet}
</Story>

<Story name="Stacked">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-4">
			<FormField {...args} label="Όνομα" helperText="Όπως στην ταυτότητα">
				{#snippet children(control)}<Input {...control} placeholder="Όνομα" />{/snippet}
			</FormField>
			<FormField {...args} label="Email" error="Μη έγκυρο email" helperText={undefined}>
				{#snippet children(control)}<Input {...control} placeholder="name@example.com" />{/snippet}
			</FormField>
		</div>
	{/snippet}
</Story>
