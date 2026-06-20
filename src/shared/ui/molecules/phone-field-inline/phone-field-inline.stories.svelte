<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PhoneFieldInline } from '$shared/ui/molecules/phone-field-inline';

	const { Story } = defineMeta({
		title: 'Molecules/Phone field (inline)',
		component: PhoneFieldInline,
		tags: ['autodocs'],
		args: {
			label: 'Αριθμός τηλεφώνου ή email',
			placeholder: '69xxxxxxxx',
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
	let dialCode = $state('+30');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-96"><PhoneFieldInline {...args} /></div>
	{/snippet}
</Story>

<Story name="Default (dial code + number)">
	{#snippet template()}
		<div class="w-96">
			<PhoneFieldInline label="Αριθμός τηλεφώνου ή email" bind:value bind:dialCode />
			<p class="mt-2 text-body-sm text-muted-foreground">{dialCode} {value || '…'}</p>
		</div>
	{/snippet}
</Story>
