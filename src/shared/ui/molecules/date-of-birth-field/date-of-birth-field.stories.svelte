<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { DateOfBirthField } from '$shared/ui/molecules/date-of-birth-field';

	const sizes = ['default', 'lg', 'xl'] as const;

	// The same stories as the application's port (3ξ, R3-11: the field family's size, with error and disabled).
	const { Story } = defineMeta({
		title: 'Molecules/DateOfBirthField',
		component: DateOfBirthField,
		tags: ['autodocs'],
		args: { label: 'Ημερομηνία γέννησης', size: 'default', disabled: false },
		argTypes: {
			size: { control: 'radio', options: sizes },
			error: { control: 'text' },
			helperText: { control: 'text' },
			label: { control: 'text' },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	let playground = $state('');
	let prefilled = $state('1990-05-15');
	let invalid = $state('');
	let disabled = $state('1990-05-15');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><DateOfBirthField {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<Story name="Prefilled">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<DateOfBirthField {...args} bind:value={prefilled} />
			<p class="mt-2 text-body-sm text-muted-foreground">Τιμή ISO: {prefilled}</p>
		</div>
	{/snippet}
</Story>

<Story name="With Error" args={{ error: 'Απαιτείται ημερομηνία γέννησης.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><DateOfBirthField {...args} bind:value={invalid} /></div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><DateOfBirthField {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>
