<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MapPricePin } from '$shared/ui/molecules/map-price-pin';
	import { MapView } from '$shared/ui/organisms/map-view';
	import { Button } from '$shared/ui/primitives/button';

	// An OFFLINE style (no tile server, no network): an empty vector style the map draws on its muted ground, so the
	// story shows the pins, their projection and the fit without asking anyone for tiles. The pages pass the ONE
	// map config (`shared/config/map`).
	const offlineStyle = `data:application/json,${encodeURIComponent(
		JSON.stringify({ version: 8, sources: {}, layers: [] })
	)}`;

	const points = [
		{ id: 'a', latitude: 37.9838, longitude: 23.7275, price: '60 €' },
		{ id: 'b', latitude: 37.9755, longitude: 23.7348, price: '45 €' },
		{ id: 'c', latitude: 37.9902, longitude: 23.7451, price: null },
		{ id: 'd', latitude: 37.9681, longitude: 23.7189, price: '80 €' }
	];

	const { Story } = defineMeta({
		title: 'Organisms/MapView',
		component: MapView,
		tags: ['autodocs'],
		args: {
			styleUrl: offlineStyle,
			points,
			camera: { center: [23.73, 37.98], zoom: 12 },
			'aria-label': 'Χάρτης',
			labelLanguage: 'el'
		}
	});
</script>

<script lang="ts">
	// U-28.2: the story owns the map's state, as a page does (the map only draws its buttons and calls back).
	let expanded = $state(false);
	let hidden = $state(false);
	const expandControl = $derived({
		expanded,
		expandLabel: 'Χάρτης σε πλήρη οθόνη',
		collapseLabel: 'Κλείσιμο χάρτη πλήρους οθόνης',
		onExpandedChange: (next: boolean) => (expanded = next)
	});
	const hideControl = { label: 'Απόκρυψη χάρτη', onHide: () => (hidden = true) };
	const zoomControls = { zoomInLabel: 'Μεγέθυνση', zoomOutLabel: 'Σμίκρυνση' };
</script>

<Story name="Pins">
	{#snippet template(args)}
		<MapView {...args} {points} class="h-map-h w-full rounded-lg">
			{#snippet pin(point, { selected })}
				<MapPricePin label={point.price} {selected} aria-label={point.price ?? point.id} />
			{/snippet}
		</MapView>
	{/snippet}
</Story>

<Story name="Selected Pin" args={{ selectedId: 'a' }}>
	{#snippet template(args)}
		<MapView {...args} {points} class="h-map-h w-full rounded-lg">
			{#snippet pin(point, { selected })}
				<MapPricePin label={point.price} {selected} aria-label={point.price ?? point.id} />
			{/snippet}
		</MapView>
	{/snippet}
</Story>

<!-- U-27.2: Airbnb's «+» / «−» at the top right, from 744 (the phone pinches): 40 × 81, 16 from the edges. -->
<Story
	name="Zoom Controls"
	globals={{ viewport: { value: 'z744', isRotated: false } }}
	args={{ zoomControls: { zoomInLabel: 'Μεγέθυνση', zoomOutLabel: 'Σμίκρυνση' } }}
>
	{#snippet template(args)}
		<MapView {...args} {points} class="h-map-h w-full rounded-lg">
			{#snippet pin(point, { selected })}
				<MapPricePin label={point.price} {selected} aria-label={point.price ?? point.id} />
			{/snippet}
		</MapView>
	{/snippet}
</Story>

<Story
	name="Zoom Controls Dark"
	globals={{ viewport: { value: 'z744', isRotated: false }, theme: 'dark' }}
	args={{ zoomControls: { zoomInLabel: 'Μεγέθυνση', zoomOutLabel: 'Σμίκρυνση' } }}
>
	{#snippet template(args)}
		<MapView {...args} {points} class="h-map-h w-full rounded-lg">
			{#snippet pin(point, { selected })}
				<MapPricePin label={point.price} {selected} aria-label={point.price ?? point.id} />
			{/snippet}
		</MapView>
	{/snippet}
</Story>

<!-- U-28.2: from 1128 the round «⤢» over the zoom (the zoom's pill then at 72) and «Απόκρυψη χάρτη» at the top left;
     pressed, «⤢» is the «×» and the pill goes (the page lays the map out). The hidden map is the page's. -->
<Story name="Layout Controls" globals={{ viewport: { value: 'z1128', isRotated: false } }}>
	{#snippet template(args)}
		{#if hidden}
			<Button
				tone="contrast"
				radius="full"
				label="Εμφάνιση χάρτη"
				onclick={() => (hidden = false)}
			/>
		{:else}
			<MapView
				{...args}
				{points}
				{zoomControls}
				{expandControl}
				{hideControl}
				class="h-map-h w-full rounded-lg"
			>
				{#snippet pin(point, { selected })}
					<MapPricePin label={point.price} {selected} aria-label={point.price ?? point.id} />
				{/snippet}
			</MapView>
		{/if}
	{/snippet}
</Story>

<Story
	name="Layout Controls Dark"
	globals={{ viewport: { value: 'z1128', isRotated: false }, theme: 'dark' }}
>
	{#snippet template(args)}
		{#if hidden}
			<Button
				tone="contrast"
				radius="full"
				label="Εμφάνιση χάρτη"
				onclick={() => (hidden = false)}
			/>
		{:else}
			<MapView
				{...args}
				{points}
				{zoomControls}
				{expandControl}
				{hideControl}
				class="h-map-h w-full rounded-lg"
			>
				{#snippet pin(point, { selected })}
					<MapPricePin label={point.price} {selected} aria-label={point.price ?? point.id} />
				{/snippet}
			</MapView>
		{/if}
	{/snippet}
</Story>
