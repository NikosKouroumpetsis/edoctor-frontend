<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PhoneField } from '$shared/ui/molecules/phone-field';

	const sizes = ['default', 'lg', 'xl'] as const;

	// The application's meta (`molecules/phone-field`).
	const { Story } = defineMeta({
		title: 'Molecules/PhoneField',
		component: PhoneField,
		tags: ['autodocs'],
		args: {
			countryAccessibilityLabel: 'Κωδικός χώρας',
			countryLabel: 'Χώρα',
			label: 'Κινητό τηλέφωνο',
			numberPlaceholder: '690 0000000',
			searchPlaceholder: 'Αναζήτηση χώρας'
		},
		argTypes: {
			label: { control: 'text' },
			helperText: { control: 'text' },
			error: { control: 'text' },
			disabled: { control: 'boolean' }
		}
	});
</script>

<script lang="ts">
	import type { PhoneValue } from '$shared/ui/molecules/phone-field';

	// Each story is controlled with its own value, as the application's `ControlledPhoneField`.
	const at = (number: string): PhoneValue => ({ dialCode: '+30', number });
	let playground = $state(at(''));
	let helper = $state(at(''));
	let invalid = $state(at('69'));
	let disabled = $state(at('6900000000'));
	const sized = $state<Record<string, PhoneValue>>({
		default: at('6900000000'),
		lg: at('6900000000'),
		xl: at('6900000000')
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PhoneField {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<Story name="With Helper Text" args={{ helperText: 'Θα χρησιμοποιηθεί για επιβεβαίωση ραντεβού.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PhoneField {...args} bind:value={helper} /></div>
	{/snippet}
</Story>

<Story name="With Error" args={{ error: 'Δώσε έγκυρο αριθμό τηλεφώνου.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PhoneField {...args} bind:value={invalid} /></div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PhoneField {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-4">
			{#each sizes as size (size)}
				<PhoneField {...args} {size} bind:value={sized[size]} />
			{/each}
		</div>
	{/snippet}
</Story>
