<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Input } from '$shared/ui/primitives/input';

	const sizes = ['sm', 'md', 'lg'] as const;

	// The application's meta (`atoms/input`): its `editable` is the web's `disabled`; every box is named.
	const { Story } = defineMeta({
		title: 'Primitives/Input',
		component: Input,
		tags: ['autodocs'],
		args: {
			placeholder: 'Αναζήτηση γιατρού',
			'aria-label': 'Αναζήτηση γιατρού',
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
		<div class="w-full max-w-narrow"><Input {...args} /></div>
	{/snippet}
</Story>

<Story name="Interactive">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Input {...args} bind:value /></div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-3">
			{#each sizes as size (size)}
				<Input {...args} {size} placeholder={size} aria-label={size} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story
	name="Invalid"
	args={{ invalid: true, placeholder: 'Μη έγκυρο email', 'aria-label': 'Μη έγκυρο email' }}
>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Input {...args} /></div>
	{/snippet}
</Story>

<Story
	name="Disabled"
	args={{ disabled: true, placeholder: 'Μη επεξεργάσιμο', 'aria-label': 'Μη επεξεργάσιμο' }}
>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Input {...args} /></div>
	{/snippet}
</Story>

<Story name="Types">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-col gap-3">
			<Input type="text" placeholder="Κείμενο" aria-label="Κείμενο" />
			<Input type="email" autocapitalize="none" placeholder="Email" aria-label="Email" />
			<Input type="password" placeholder="Κωδικός πρόσβασης" aria-label="Κωδικός πρόσβασης" />
		</div>
	{/snippet}
</Story>
