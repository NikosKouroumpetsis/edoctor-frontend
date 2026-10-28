<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { OfferingCard } from '$shared/ui/molecules/offering-card';
	import { PriceLabel } from '$shared/ui/primitives/price-label';

	const blocks = [
		{
			id: 'includes',
			label: 'Περιλαμβάνει',
			body: 'Κλινική εξέταση, ηλεκτροκαρδιογράφημα και συνταγή.'
		},
		{ id: 'description', label: 'Περιγραφή', body: 'Η πρώτη επίσκεψη διαρκεί περίπου 30 λεπτά.' }
	];

	const { Story } = defineMeta({
		title: 'Molecules/OfferingCard',
		component: OfferingCard,
		tags: ['autodocs']
	});
</script>

{#snippet amount()}
	<PriceLabel kind="amount" label="40 €" placement="offer" />
{/snippet}
{#snippet signIn()}
	<PriceLabel kind="action" label="Συνδεθείτε" placement="offer" onAction={() => {}} />
{/snippet}
{#snippet note()}
	<PriceLabel kind="note" label="Κατόπιν επικοινωνίας" placement="offer" />
{/snippet}

<Story name="Amount">
	{#snippet template()}
		<div class="w-full max-w-form">
			<OfferingCard title="Πρώτη συνάντηση" priceCaption="Από" price={amount} {blocks} />
		</div>
	{/snippet}
</Story>

<Story name="Sign in for the price">
	{#snippet template()}
		<div class="w-full max-w-form">
			<OfferingCard title="Πρώτη συνάντηση" priceCaption="Κόστος" price={signIn} {blocks} />
		</div>
	{/snippet}
</Story>

<Story name="On request">
	{#snippet template()}
		<div class="w-full max-w-form">
			<OfferingCard title="Επανεξέταση" priceCaption="Κόστος" price={note} />
		</div>
	{/snippet}
</Story>

<Story name="Without blocks">
	{#snippet template()}
		<div class="w-full max-w-form">
			<OfferingCard title="Ηλεκτροκαρδιογράφημα" priceCaption="Από" price={amount} />
		</div>
	{/snippet}
</Story>

<Story name="A list of offers">
	{#snippet template()}
		<div class="flex w-full max-w-form flex-col gap-6 border-t border-border/60 pt-6">
			<OfferingCard title="Πρώτη συνάντηση" priceCaption="Από" price={amount} {blocks} />
			<OfferingCard title="Επανεξέταση" priceCaption="Κόστος" price={note} />
			<OfferingCard title="Ηλεκτροκαρδιογράφημα" priceCaption="Κόστος" price={signIn} />
		</div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="flex w-full max-w-form flex-col gap-6 bg-background p-card">
			<OfferingCard title="Πρώτη συνάντηση" priceCaption="Από" price={amount} {blocks} />
			<OfferingCard title="Επανεξέταση" priceCaption="Κόστος" price={signIn} />
		</div>
	{/snippet}
</Story>
