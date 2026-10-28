<script lang="ts">
	import { PriceLabel } from '$shared/ui/primitives/price-label';
	import { OfferingCard, type OfferingBlock } from './index';

	let { blocks }: { blocks?: OfferingBlock[] } = $props();
</script>

<OfferingCard
	title="Πρώτη συνάντηση"
	priceCaption="Από"
	priceTestId="price"
	{blocks}
	testId="offer"
>
	{#snippet price()}
		<PriceLabel kind="amount" label="40 €" placement="offer" />
	{/snippet}
</OfferingCard>
