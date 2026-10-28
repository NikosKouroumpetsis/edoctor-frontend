<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { SuggestionGroupHeader } from '$shared/ui/molecules/suggestion-group-header';
	import { OptionRow } from '$shared/ui/molecules/option-row';

	const noop = () => {};
	/** The criteria panel's «Τι» typeahead (M-36): groups of rows, the typed part in bold. */
	const groups = [
		{
			id: 'specialties',
			label: 'Ειδικότητες',
			icon: 'medkit-outline',
			options: [
				{ id: 'cardiology', label: 'Καρδιολόγος', supporting: undefined },
				{ id: 'cardiac-surgery', label: 'Καρδιοχειρουργός', supporting: undefined }
			]
		},
		{
			id: 'doctors',
			label: 'Γιατροί',
			icon: 'person-outline',
			options: [{ id: 'maria', label: 'Μαρία Καρδαμίτση', supporting: 'Παθολόγος · Αθήνα' }]
		}
	] as const;
	const optionIds = groups.flatMap((group) => group.options.map((option) => `story-${option.id}`));

	// The application's meta (`molecules/option-row`): «Πειραιάς» / «Περιοχή», not chosen.
	const { Story } = defineMeta({
		title: 'Molecules/OptionRow',
		component: OptionRow,
		tags: ['autodocs'],
		args: {
			icon: 'location-outline',
			label: 'Πειραιάς',
			supportingLabel: 'Περιοχή',
			isSelected: false,
			onclick: noop,
			testId: 'option-piraeus'
		},
		argTypes: {
			size: { control: 'select', options: ['md', 'lg'] },
			accessibilityRole: { control: 'select', options: ['button', 'radio', 'option'] }
		}
	});
</script>

<script lang="ts">
	let query = $state('Καρδ');
	let activeId = $state<string | undefined>();
	let chosen = $state<string | undefined>();
	let interactive = $state(false);
	let bordered = $state(false);
</script>

{#snippet flag()}<span aria-hidden="true" class="text-title-sm">🇬🇷</span>{/snippet}

<Story name="Playground" />

<Story name="Selected" args={{ isSelected: true }} />

<Story name="No Supporting" args={{ supportingLabel: undefined }} />

<Story name="Interactive">
	{#snippet template(args)}
		<OptionRow {...args} isSelected={interactive} onclick={() => (interactive = !interactive)} />
	{/snippet}
</Story>

<Story name="With Count" args={{ count: '128', supportingLabel: undefined }} />

<Story name="Leading Content And Count">
	{#snippet template(args)}
		<OptionRow
			{...args}
			accessibilityRole="radio"
			count="128"
			label="Ελληνικά"
			labelClass="font-medium"
			leading={flag}
			size="lg"
			supportingLabel={undefined}
		/>
	{/snippet}
</Story>

<!-- The filters-modal communication-language treatment: a permanent outline that deepens to the dark selection
     colour when picked (`bordered`), no leading tile, a facet count, and the lg size. -->
<Story name="Bordered">
	{#snippet template(args)}
		<OptionRow
			{...args}
			accessibilityRole="radio"
			bordered
			count="128"
			icon={undefined}
			label="Ελληνικά"
			labelClass="font-medium"
			leading={null}
			size="lg"
			supportingLabel={undefined}
			isSelected={bordered}
			onclick={() => (bordered = !bordered)}
		/>
	{/snippet}
</Story>

<!-- Work in progress (finding the device's position): a spinner in the tile, the press ignored. -->
<Story
	name="Busy"
	args={{ icon: 'navigate-outline', isBusy: true, label: 'Κοντά μου', supportingLabel: undefined }}
/>

<Story
	name="Disabled"
	args={{ disabled: true, label: 'Θεσσαλονίκη', supportingLabel: undefined }}
/>

<!-- The part of the label that matches what was typed, in bold. -->
<Story
	name="With Query"
	args={{
		icon: 'medkit-outline',
		label: 'Καρδιολόγος',
		labelClass: 'font-medium',
		query: 'Καρδ',
		supportingLabel: undefined
	}}
/>

<!-- Web only (the keyboard): a combobox field over grouped `option` rows, `aria-activedescendant`. -->
<Story name="Typeahead With Groups">
	{#snippet template()}
		<div class="flex w-full max-w-form flex-col gap-section p-card">
			<SearchField
				variant="active"
				bind:value={query}
				bind:activeId
				placeholder="Ειδικότητα, γιατρός ή υπηρεσία"
				aria-label="Τι ψάχνετε;"
				onBack={noop}
				backLabel="Πίσω"
				onClear={noop}
				clearLabel="Καθαρισμός πεδίου"
				listboxId="story-what-suggestions"
				{optionIds}
				onCommit={(id) => (chosen = id)}
			/>
			<div
				id="story-what-suggestions"
				role="listbox"
				aria-label="Προτάσεις"
				class="flex flex-col gap-3.5"
			>
				{#each groups as group (group.id)}
					<div role="group" aria-labelledby={`story-group-${group.id}`} class="flex flex-col gap-1">
						<SuggestionGroupHeader
							id={`story-group-${group.id}`}
							label={group.label}
							icon={group.icon}
						/>
						{#each group.options as option (option.id)}
							<OptionRow
								accessibilityRole="option"
								id={`story-${option.id}`}
								active={activeId === `story-${option.id}`}
								isSelected={chosen === `story-${option.id}`}
								label={option.label}
								labelClass="font-medium"
								supportingLabel={option.supporting}
								icon={group.icon}
								{query}
								onclick={() => (chosen = `story-${option.id}`)}
							/>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{/snippet}
</Story>
