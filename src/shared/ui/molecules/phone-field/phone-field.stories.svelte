<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PhoneField } from '$shared/ui/molecules/phone-field';

	const { Story } = defineMeta({
		title: 'Molecules/Phone field',
		component: PhoneField,
		tags: ['autodocs'],
		args: { label: 'Phone number', placeholder: '69xxxxxxxx', size: 'default', disabled: false },
		argTypes: {
			size: { control: 'select', options: ['sm', 'default', 'lg', 'xl'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let value = $state('');
	let dialCode = $state('+30');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-80"><PhoneField {...args} /></div>
	{/snippet}
</Story>

<Story name="Default (dial code + number)">
	{#snippet template()}
		<div class="w-80">
			<PhoneField label="Phone number" bind:value bind:dialCode />
			<p class="mt-2 text-body-sm text-muted-foreground">{dialCode} {value || '…'}</p>
		</div>
	{/snippet}
</Story>
