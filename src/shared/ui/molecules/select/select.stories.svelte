<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Select, type SelectOption } from '$shared/ui/molecules/select';
	import { FormField } from '$shared/ui/molecules/form-field';

	const cities: SelectOption[] = [
		{ label: 'Αθήνα', subtitle: 'Αττική', value: 'athens' },
		{ label: 'Θεσσαλονίκη', subtitle: 'Κεντρική Μακεδονία', value: 'thessaloniki' },
		{ label: 'Πάτρα', subtitle: 'Δυτική Ελλάδα', value: 'patras' },
		{ label: 'Ηράκλειο', subtitle: 'Κρήτη', value: 'heraklion' },
		{ label: 'Λάρισα', subtitle: 'Θεσσαλία', value: 'larissa' }
	];

	// The application's meta (`molecules/select`); its `triggerAccessibilityLabel` is the web's `aria-label`.
	const { Story } = defineMeta({
		title: 'Molecules/Select',
		component: Select,
		tags: ['autodocs'],
		args: { options: cities, placeholder: 'Επιλέξτε πόλη', 'aria-label': 'Πόλη' },
		argTypes: {
			disabled: { control: 'boolean' },
			invalid: { control: 'boolean' },
			searchable: { control: 'boolean' },
			placeholder: { control: 'text' },
			variant: { control: 'radio', options: ['field', 'pill'] }
		}
	});
</script>

<script lang="ts">
	// Each story is controlled with its own value, as the application's `ControlledSelect`.
	let playground = $state<string | undefined>(undefined);
	let searchable = $state<string | undefined>(undefined);
	let large = $state<string | undefined>(undefined);
	let pill = $state<string | undefined>(undefined);
	let pillLarge = $state<string | undefined>(undefined);
	let filled = $state<string | undefined>('patras');
	let inField = $state<string | undefined>(undefined);
	let invalid = $state<string | undefined>(undefined);
	let disabled = $state<string | undefined>(undefined);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><Select {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<Story name="Searchable" args={{ searchable: true, searchPlaceholder: 'Αναζήτηση' }}>
	{#snippet template(args)}
		<div class="w-full max-w-form"><Select {...args} bind:value={searchable} /></div>
	{/snippet}
</Story>

<!-- The `lg` field box, for a select stacked in a column of `lg` inputs. -->
<Story name="Large" args={{ size: 'lg' }}>
	{#snippet template(args)}
		<div class="w-full max-w-form"><Select {...args} bind:value={large} /></div>
	{/snippet}
</Story>

<!-- The compact inline trigger: content-width, pill-shaped, for a sort/filter control in a row. -->
<Story name="Pill" args={{ placeholder: 'Πιο πρόσφατες', variant: 'pill' }}>
	{#snippet template(args)}
		<div class="w-full max-w-form"><Select {...args} bind:value={pill} /></div>
	{/snippet}
</Story>

<Story name="Pill Large" args={{ placeholder: 'Πιο πρόσφατες', size: 'lg', variant: 'pill' }}>
	{#snippet template(args)}
		<div class="w-full max-w-form"><Select {...args} bind:value={pillLarge} /></div>
	{/snippet}
</Story>

<Story name="Filled">
	{#snippet template(args)}
		<div class="w-full max-w-form"><Select {...args} bind:value={filled} /></div>
	{/snippet}
</Story>

<Story name="In Form Field">
	{#snippet template(args)}
		<div class="w-full max-w-form">
			<FormField label="Πόλη" helperText="Επιλέξτε την πόλη σας">
				{#snippet children(control)}
					<Select
						{...args}
						id={control.id}
						aria-label={undefined}
						aria-describedby={control['aria-describedby']}
						invalid={control['aria-invalid'] === 'true'}
						bind:value={inField}
					/>
				{/snippet}
			</FormField>
		</div>
	{/snippet}
</Story>

<Story name="Invalid">
	{#snippet template(args)}
		<div class="w-full max-w-form">
			<FormField label="Πόλη" error="Απαιτείται επιλογή">
				{#snippet children(control)}
					<Select
						{...args}
						id={control.id}
						aria-label={undefined}
						aria-describedby={control['aria-describedby']}
						invalid={control['aria-invalid'] === 'true'}
						bind:value={invalid}
					/>
				{/snippet}
			</FormField>
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-form"><Select {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>
