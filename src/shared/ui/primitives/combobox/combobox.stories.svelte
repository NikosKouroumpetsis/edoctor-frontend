<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Combobox, type ComboboxOption } from '$shared/ui/primitives/combobox';

	const cities: ComboboxOption[] = [
		{ label: 'Αθήνα', value: 'athens' },
		{ label: 'Θεσσαλονίκη', value: 'thessaloniki' },
		{ label: 'Πάτρα', value: 'patras' },
		{ label: 'Ηράκλειο', value: 'heraklion' },
		{ label: 'Λάρισα', value: 'larissa' }
	];

	// The application's meta (`molecules/combobox`). The web types in the field itself, so its placeholder is the
	// application's `searchPlaceholder`; the trailing button is named by `clearLabel` / `toggleLabel`.
	const { Story } = defineMeta({
		title: 'Primitives/Combobox',
		component: Combobox,
		tags: ['autodocs'],
		args: {
			emptyText: 'Δεν βρέθηκαν αποτελέσματα',
			options: cities,
			label: 'Πόλη',
			placeholder: 'Αναζήτηση',
			clearLabel: 'Καθαρισμός',
			toggleLabel: 'Επιλογές'
		},
		argTypes: {
			allowFreeText: { control: 'boolean' },
			chevron: { control: 'boolean' },
			disabled: { control: 'boolean' },
			searchIcon: { control: 'boolean' },
			label: { control: 'text' },
			error: { control: 'text' }
		}
	});
</script>

<script lang="ts">
	// Each story is controlled with its own value, as the application's `Controlled`.
	let playground = $state('');
	let filled = $state('patras');
	let invalid = $state('');
	let disabled = $state('athens');
	let strict = $state('');
	let withSearchIcon = $state('');
	let noChevron = $state('');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Combobox {...args} bind:value={playground} /></div>
	{/snippet}
</Story>

<Story name="Filled">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Combobox {...args} bind:value={filled} /></div>
	{/snippet}
</Story>

<Story name="With Error" args={{ error: 'Απαιτείται επιλογή.' }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Combobox {...args} bind:value={invalid} /></div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Combobox {...args} bind:value={disabled} /></div>
	{/snippet}
</Story>

<!-- Only an option can be committed: typed text that matches none is dropped. -->
<Story name="Strict" args={{ allowFreeText: false }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Combobox {...args} bind:value={strict} /></div>
	{/snippet}
</Story>

<!-- The search glyph is opt-in (off by default, the application's look, U-07.3). -->
<Story name="With Search Icon" args={{ searchIcon: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Combobox {...args} bind:value={withSearchIcon} /></div>
	{/snippet}
</Story>

<Story name="Without Chevron" args={{ chevron: false }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><Combobox {...args} bind:value={noChevron} /></div>
	{/snippet}
</Story>
