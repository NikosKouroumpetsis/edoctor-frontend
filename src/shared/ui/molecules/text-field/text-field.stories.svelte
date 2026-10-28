<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	const sizes = ['default', 'lg', 'xl'] as const;

	// The application's meta (`molecules/text-field`).
	const { Story } = defineMeta({
		title: 'Molecules/TextField',
		component: TextField,
		tags: ['autodocs'],
		args: {
			label: 'Email',
			placeholder: 'name@example.com',
			size: 'default',
			disabled: false
		},
		argTypes: {
			label: { control: 'text' },
			placeholder: { control: 'text' },
			helperText: { control: 'text' },
			error: { control: 'text' },
			size: { control: 'radio', options: sizes },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	import { createForm, Validators } from '$shared/lib/form';

	// Each story is controlled with its own value, as the application's `Controlled`.
	let playground = $state('');
	let filled = $state('name@example.com');
	let helper = $state('');
	let invalid = $state('not-an-email');
	let search = $state('');
	let disabled = $state('name@example.com');
	const sized = $state<Record<string, string>>({ default: '', lg: '', xl: '' });

	// Validated through the shared form: the error shows once the field has been left.
	const form = createForm({
		initialValues: { email: '' },
		validators: { email: [Validators.required, Validators.email] },
		messages: { email: { required: 'Υποχρεωτικό πεδίο', email: 'Δώσε ένα έγκυρο email.' } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><TextField {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<Story name="Filled">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><TextField {...args} bind:value={filled} /></div>
	{/snippet}
</Story>

<Story name="With Helper Text" args={{ helperText: 'Δεν θα κοινοποιηθεί ποτέ.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><TextField {...args} bind:value={helper} /></div>
	{/snippet}
</Story>

<Story name="With Error" args={{ error: 'Δώσε ένα έγκυρο email.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><TextField {...args} bind:value={invalid} /></div>
	{/snippet}
</Story>

<Story name="With Leading Icon">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<TextField {...args} label="Αναζήτηση" bind:value={search}>
				{#snippet leading()}<Ionicon
						name="search"
						class="icon-md text-muted-foreground"
					/>{/snippet}
			</TextField>
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><TextField {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-4">
			{#each sizes as size (size)}
				<TextField {...args} {size} label={`Size ${size}`} bind:value={sized[size]} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Form Connected">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><TextField {...args} field={form.field('email')} /></div>
	{/snippet}
</Story>
