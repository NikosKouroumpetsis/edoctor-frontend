<script lang="ts">
	import {
		StickyActionBar,
		type StickyActionBarCta,
		type StickyActionBarLayout,
		type StickyActionBarRoom,
		type StickyActionBarZone
	} from './index';

	let {
		notice,
		loading,
		cta = { label: 'Κράτηση' },
		layout,
		zone,
		room,
		supportingAction,
		withSecondary = false,
		height = $bindable(0)
	}: {
		notice?: string | null;
		loading?: boolean;
		cta?: StickyActionBarCta;
		layout?: StickyActionBarLayout;
		zone?: StickyActionBarZone;
		room?: StickyActionBarRoom;
		supportingAction?: () => void;
		withSecondary?: boolean;
		height?: number;
	} = $props();
</script>

<StickyActionBar
	summary="Επίσκεψη στο ιατρείο"
	supporting="Επόμενη: Τρι 10:00"
	{notice}
	{loading}
	{cta}
	{layout}
	{zone}
	{room}
	{supportingAction}
	secondary={withSecondary ? secondaryLink : undefined}
	bind:height
	ctaTestId="cta"
	data-testid="bar"
>
	{#snippet price()}
		<p class="text-title-sm font-semibold">40 €</p>
	{/snippet}
</StickyActionBar>

{#snippet secondaryLink()}
	<a href="tel:+302100000000" class="inline-flex min-h-touch min-w-touch items-center underline"
		>Κλήση ιατρείου</a
	>
{/snippet}
