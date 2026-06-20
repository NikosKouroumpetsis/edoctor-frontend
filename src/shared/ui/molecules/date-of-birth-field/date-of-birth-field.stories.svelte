<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { DateOfBirthField } from '$shared/ui/molecules/date-of-birth-field';

	const { Story } = defineMeta({
		title: 'Molecules/Date of birth field',
		component: DateOfBirthField,
		tags: ['autodocs'],
		args: { label: 'Date of birth', size: 'default', disabled: false },
		argTypes: {
			size: { control: 'select', options: ['sm', 'default', 'lg', 'xl'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let value = $state('');
	let prefilled = $state('1990-05-15');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-96"><DateOfBirthField {...args} /></div>
	{/snippet}
</Story>

<Story name="Default">
	{#snippet template()}
		<div class="w-96"><DateOfBirthField label="Date of birth" bind:value /></div>
	{/snippet}
</Story>

<Story name="Pre-filled">
	{#snippet template()}
		<div class="w-96">
			<DateOfBirthField label="Date of birth" bind:value={prefilled} />
			<p class="mt-2 text-body-sm text-muted-foreground">ISO value: {prefilled}</p>
		</div>
	{/snippet}
</Story>
