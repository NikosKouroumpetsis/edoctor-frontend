<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MapPricePin } from '$shared/ui/molecules/map-price-pin';

	// U-24.4: the results map's pin — the price pill, or the dot when the fee needs sign-in.
	const { Story } = defineMeta({
		title: 'Molecules/MapPricePin',
		component: MapPricePin,
		tags: ['autodocs'],
		args: { label: '60 €', selected: false, hot: false, 'aria-label': 'Α. Παππάς, 60 €' }
	});
</script>

<Story name="Price" />

<Story name="Price Selected" args={{ selected: true }} />

<Story name="Price Hot" args={{ hot: true }} />

<Story name="Dot" args={{ label: null, 'aria-label': 'Α. Παππάς' }} />

<Story name="Dot Selected" args={{ label: null, selected: true, 'aria-label': 'Α. Παππάς' }} />
