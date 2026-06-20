<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { TextField } from '$shared/ui/molecules/text-field';
	import MailIcon from '~icons/lucide/mail';

	const { Story } = defineMeta({
		title: 'Molecules/Text field',
		component: TextField,
		tags: ['autodocs'],
		args: {
			label: 'Email',
			placeholder: 'you@example.com',
			size: 'default',
			type: 'text',
			disabled: false
		},
		argTypes: {
			size: { control: 'select', options: ['sm', 'default', 'lg', 'xl'] },
			type: { control: 'select', options: ['text', 'email', 'password', 'tel'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	import { createForm, Validators } from '$shared/lib/form';

	let value = $state('');
	const form = createForm({
		initialValues: { email: '' },
		validators: { email: [Validators.required, Validators.email] }
	});
</script>

<!-- Controls-driven: change `size` in the Controls panel to see it apply live. -->
<Story name="Playground">
	{#snippet template(args)}
		<div class="w-80"><TextField {...args} /></div>
	{/snippet}
</Story>

<Story name="Standalone">
	{#snippet template()}
		<div class="w-80">
			<TextField label="Email" bind:value type="email" />
			<p class="mt-2 text-body-sm text-muted-foreground">Value: {value || '(empty)'}</p>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex w-80 flex-col gap-4">
			<TextField label="Small" size="sm" />
			<TextField label="Default" size="default" />
			<TextField label="Large" size="lg" />
			<TextField label="Extra large" size="xl" />
		</div>
	{/snippet}
</Story>

<Story name="With error">
	{#snippet template()}
		<div class="w-80">
			<TextField label="Email" value="bad" error="Enter a valid email address" />
		</div>
	{/snippet}
</Story>

<Story name="Leading/trailing">
	{#snippet template()}
		<div class="w-80">
			<TextField label="Email">
				{#snippet leading()}
					<MailIcon class="size-4" />
				{/snippet}
			</TextField>
		</div>
	{/snippet}
</Story>

<Story name="Form-connected (blur to validate)">
	{#snippet template()}
		<div class="w-80">
			<TextField label="Email" field={form.field('email')} type="email" />
		</div>
	{/snippet}
</Story>
