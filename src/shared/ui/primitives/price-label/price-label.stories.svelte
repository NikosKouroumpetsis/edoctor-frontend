<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PriceLabel, type PriceLabelPlacement } from '$shared/ui/primitives/price-label';

	const placements: PriceLabelPlacement[] = ['card', 'card-list', 'bar', 'offer'];
	const noop = () => {};

	// The application's meta (`atoms/price-label`): «Από 40 €» on a card.
	const { Story } = defineMeta({
		title: 'Primitives/PriceLabel',
		component: PriceLabel,
		tags: ['autodocs'],
		args: { kind: 'amount', label: 'Από 40 €', placement: 'card' },
		argTypes: {
			kind: { control: 'radio', options: ['amount', 'note'] },
			placement: { control: 'radio', options: placements }
		}
	});
</script>

<Story name="Amount" />

<Story name="Note" args={{ kind: 'note', label: 'Κατόπιν επικοινωνίας' }} />

<Story name="Action">
	{#snippet template()}
		<PriceLabel kind="action" label="Συνδεθείτε για την τιμή" onAction={noop} placement="card" />
	{/snippet}
</Story>

<!-- The twelve looks: each placement with its amount, its note and its action. -->
<Story name="All Placements">
	{#snippet template()}
		<div class="flex flex-col gap-section">
			{#each placements as placement (placement)}
				<div class="flex flex-col gap-2">
					<p class="text-label-md text-muted-foreground">{placement}</p>
					<PriceLabel kind="amount" label="40–60 €" {placement} />
					<PriceLabel kind="note" label="Κατόπιν επικοινωνίας" {placement} />
					<PriceLabel kind="action" label="Συνδεθείτε για την τιμή" onAction={noop} {placement} />
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
