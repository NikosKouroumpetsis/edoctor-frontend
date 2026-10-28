<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Chip } from '$shared/ui/primitives/chip';
	import { ChipGroup } from '$shared/ui/molecules/chip-group';

	const { Story } = defineMeta({
		title: 'Molecules/ChipGroup',
		component: ChipGroup,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	// The application's chips are pressed by the reader in its workshop; here each press toggles its own state.
	let payments = $state<string[]>(['cash']);
	let day = $state('today');
	const toggle = (value: string) =>
		(payments = payments.includes(value)
			? payments.filter((entry) => entry !== value)
			: [...payments, value]);
</script>

<!-- Toggles with counts, one of them selected: the tinted look. -->
<Story name="Toggles">
	{#snippet template()}
		<ChipGroup type="multiple" aria-label="Πληρωμή">
			<Chip
				count="12"
				icon="cash-outline"
				label="Μετρητά"
				variant="tinted"
				selected={payments.includes('cash')}
				onclick={() => toggle('cash')}
			/>
			<Chip
				count="8"
				icon="card-outline"
				label="Κάρτα"
				variant="tinted"
				selected={payments.includes('card')}
				onclick={() => toggle('card')}
			/>
			<Chip
				count="3"
				icon="phone-portrait-outline"
				label="Πληρωμή με κινητό"
				variant="tinted"
				selected={payments.includes('mobile')}
				onclick={() => toggle('mobile')}
			/>
		</ChipGroup>
	{/snippet}
</Story>

<!-- Selections that are removed with their «✕». -->
<Story name="Removable">
	{#snippet template()}
		<ChipGroup aria-label="Επιλογές">
			<Chip label="Μετρητά" removable variant="tinted" onRemove={() => {}} />
			<Chip label="Χώρος στάθμευσης" removable variant="tinted" onRemove={() => {}} />
		</ChipGroup>
	{/snippet}
</Story>

<Story name="Filled">
	{#snippet template()}
		<ChipGroup type="single" aria-label="Ημέρα">
			<Chip label="Σήμερα" selected={day === 'today'} onclick={() => (day = 'today')} />
			<Chip label="Αύριο" selected={day === 'tomorrow'} onclick={() => (day = 'tomorrow')} />
			<Chip label="Αυτή την εβδομάδα" selected={day === 'week'} onclick={() => (day = 'week')} />
		</ChipGroup>
	{/snippet}
</Story>
