<script lang="ts">
	import { StickyActionBar, type StickyActionBarCta } from './index';

	let {
		notice,
		loading,
		cta = { label: 'Κράτηση' },
		height = $bindable(0)
	}: {
		notice?: string | null;
		loading?: boolean;
		cta?: StickyActionBarCta;
		height?: number;
	} = $props();
</script>

<StickyActionBar
	summary="Επίσκεψη στο ιατρείο"
	supporting="Επόμενη: Τρι 10:00"
	{notice}
	{loading}
	{cta}
	bind:height
	ctaTestId="cta"
	data-testid="bar"
>
	{#snippet price()}
		<p class="text-title-sm font-semibold">40 €</p>
	{/snippet}
</StickyActionBar>
