<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PasswordField } from '$shared/ui/molecules/password-field';

	const { Story } = defineMeta({
		title: 'Molecules/Password field',
		component: PasswordField,
		tags: ['autodocs'],
		args: {
			label: 'Password',
			placeholder: 'Enter your password',
			size: 'default',
			disabled: false
		},
		argTypes: {
			size: { control: 'select', options: ['sm', 'default', 'lg', 'xl'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let value = $state('');
	let revealValue = $state('hunter2');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-80"><PasswordField {...args} /></div>
	{/snippet}
</Story>

<Story name="Default">
	{#snippet template()}
		<div class="w-80"><PasswordField label="Password" bind:value /></div>
	{/snippet}
</Story>

<Story name="Reveal toggle">
	{#snippet template()}
		<div class="w-80">
			<PasswordField label="Password" bind:value={revealValue} autocomplete="new-password" />
			<p class="mt-2 text-body-sm text-muted-foreground">Use the eye button to reveal the value.</p>
		</div>
	{/snippet}
</Story>

<Story name="With error">
	{#snippet template()}
		<div class="w-80">
			<PasswordField label="Password" value="123" error="Use at least 8 characters" />
		</div>
	{/snippet}
</Story>
