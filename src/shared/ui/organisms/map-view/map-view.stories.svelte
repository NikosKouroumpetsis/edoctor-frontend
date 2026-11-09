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
	// Wave 3: the map moves under a pin fixed in the middle; the story keeps the centre and whether the person moved it.
	let pinCenter = $state({ latitude: 37.98, longitude: 23.73 });
	let pinMoved = $state(false);
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

<!-- Wave 3 (record §6.7.4): the map moves under a pin fixed in the middle — the zoom around the centre, «+» / «−» at every
     width at the bottom left, each move's end read back. The pin is the caller's own mark over the map. -->
<Story name="Fixed Pin">
	{#snippet template(args)}
		<div class="relative h-map-h w-full overflow-hidden rounded-lg">
			<MapView
				{...args}
				points={[]}
				{zoomControls}
				zoomControlsFrom="phone"
				zoomControlsClass="top-auto right-auto bottom-2 left-3"
				zoomAround="center"
				onMoveEnd={(center, move) => {
					pinCenter = center;
					if (move.byUser) pinMoved = true;
				}}
				class="size-full"
			>
				{#snippet pin()}{/snippet}
			</MapView>
			<span
				aria-hidden="true"
				class="pointer-events-none absolute top-1/2 left-1/2 size-touch -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
			></span>
		</div>
		<p class="mt-2 text-body-sm text-muted-foreground">
			{pinCenter.latitude.toFixed(5)}, {pinCenter.longitude.toFixed(5)} · {pinMoved
				? 'μετακινήθηκε'
				: '—'}
		</p>
	{/snippet}
</Story>
