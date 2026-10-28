<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SearchField } from '$shared/ui/molecules/search-field';

	const noop = () => {};

	// The application's meta (`molecules/search-field`): the launcher, «Οποιοδήποτε», named «Αναζήτηση».
	const { Story } = defineMeta({
		title: 'Molecules/SearchField',
		component: SearchField,
		tags: ['autodocs'],
		args: {
			'aria-label': 'Αναζήτηση',
			onclick: noop,
			placeholder: 'Οποιοδήποτε',
			variant: 'launcher'
		},
		argTypes: { variant: { control: 'select', options: ['launcher', 'active', 'inset'] } }
	});
</script>

<script lang="ts">
	let active = $state('Αθή');
	let activeEmpty = $state('');
	let inset = $state('Ελλ');
	let insetEmpty = $state('');
	let allActive = $state('Αθή');
	let allInset = $state('Ελλ');
</script>

{#snippet activeField(value: { get: () => string; set: (next: string) => void })}
	<SearchField
		variant="active"
		aria-label="Αναζήτηση"
		placeholder="Αναζήτηση"
		backLabel="Πίσω"
		onBack={noop}
		clearLabel="Καθαρισμός"
		onClear={() => value.set('')}
		bind:value={value.get, value.set}
	/>
{/snippet}

{#snippet insetField(value: { get: () => string; set: (next: string) => void })}
	<SearchField
		variant="inset"
		aria-label="Αναζήτηση χώρας"
		placeholder="Αναζήτηση χώρας"
		onClear={() => value.set('')}
		bind:value={value.get, value.set}
	/>
{/snippet}

<Story name="Launcher" />

<Story name="Launcher With Value" args={{ value: 'Αθήνα' }} />

<Story name="Active">
	{#snippet template()}
		{@render activeField({ get: () => active, set: (next) => (active = next) })}
	{/snippet}
</Story>

<Story name="Active Empty">
	{#snippet template()}
		{@render activeField({ get: () => activeEmpty, set: (next) => (activeEmpty = next) })}
	{/snippet}
</Story>

<Story name="Inset">
	{#snippet template()}
		{@render insetField({ get: () => inset, set: (next) => (inset = next) })}
	{/snippet}
</Story>

<Story name="Inset Empty">
	{#snippet template()}
		{@render insetField({ get: () => insetEmpty, set: (next) => (insetEmpty = next) })}
	{/snippet}
</Story>

<!-- The application's `editable={false}`: on the web a disabled field. -->
<Story name="Inset Disabled">
	{#snippet template()}
		<SearchField
			variant="inset"
			aria-label="Αναζήτηση χώρας"
			placeholder="Αναζήτηση χώρας"
			value="Μη επεξεργάσιμο"
			disabled
		/>
	{/snippet}
</Story>

<!-- The three looks one above the other, as the search screens draw them. -->
<Story name="All Variants">
	{#snippet template()}
		<div class="flex flex-col gap-6">
			<SearchField
				variant="launcher"
				aria-label="Αναζήτηση"
				placeholder="Οποιοδήποτε"
				onclick={noop}
			/>
			{@render activeField({ get: () => allActive, set: (next) => (allActive = next) })}
			{@render insetField({ get: () => allInset, set: (next) => (allInset = next) })}
		</div>
	{/snippet}
</Story>
