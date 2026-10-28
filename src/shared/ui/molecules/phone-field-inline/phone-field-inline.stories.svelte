<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PhoneFieldInline } from '$shared/ui/molecules/phone-field-inline';

	const sizes = ['default', 'lg', 'xl'] as const;

	// The application's meta (`molecules/phone-field-inline`).
	const { Story } = defineMeta({
		title: 'Molecules/PhoneFieldInline',
		component: PhoneFieldInline,
		tags: ['autodocs'],
		args: {
			countryAccessibilityLabel: 'Κωδικός χώρας',
			label: 'Αριθμός τηλεφώνου',
			numberPlaceholder: '69xxxxxxxx',
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

	// Each story is controlled with its own value, as the application's `ControlledInlineField`.
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
		<div class="w-full max-w-narrow"><PhoneFieldInline {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<Story name="With Helper Text" args={{ helperText: 'Θα χρησιμοποιηθεί για επιβεβαίωση ραντεβού.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PhoneFieldInline {...args} bind:value={helper} /></div>
	{/snippet}
</Story>

<Story name="With Error" args={{ error: 'Δώσε έγκυρο αριθμό τηλεφώνου.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PhoneFieldInline {...args} bind:value={invalid} /></div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><PhoneFieldInline {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-4">
			{#each sizes as size (size)}
				<PhoneFieldInline {...args} {size} bind:value={sized[size]} />
			{/each}
		</div>
	{/snippet}
</Story>
