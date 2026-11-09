<script lang="ts">
	import {
		MapView,
		type MapViewCenter,
		type MapViewExpandControl,
		type MapViewHideControl,
		type MapViewMove,
		type MapViewPadding,
		type MapViewPoint,
		type MapViewZoomControls
	} from './index';

	let {
		styleUrl = 'https://tiles.example/styles/light',
		points = [],
		selectedId = null,
		labelLanguage = 'el',
		fitKey,
		fitPadding,
		onMapPress,
		zoomControls,
		expandControl,
		hideControl,
		scrollZoom,
		fitAnimate,
		zoomControlsFrom,
		zoomControlsClass,
		zoomAround,
		onMoveStart,
		onMoveEnd,
		attributionLabel,
		ariaLabel = 'Χάρτης'
	}: {
		styleUrl?: string;
		points?: MapViewPoint[];
		selectedId?: string | null;
		labelLanguage?: string;
		fitKey?: string;
		fitPadding?: () => MapViewPadding;
		onMapPress?: () => void;
		zoomControls?: MapViewZoomControls;
		expandControl?: MapViewExpandControl;
		hideControl?: MapViewHideControl;
		scrollZoom?: boolean;
		fitAnimate?: boolean;
		zoomControlsFrom?: 'phone' | 'tablet';
		zoomControlsClass?: string;
		zoomAround?: 'pointer' | 'center';
		onMoveStart?: (move: MapViewMove) => void;
		onMoveEnd?: (center: MapViewCenter, move: MapViewMove) => void;
		attributionLabel?: string;
		ariaLabel?: string;
	} = $props();
</script>

<MapView
	{styleUrl}
	{points}
	{selectedId}
	{labelLanguage}
	{fitKey}
	{fitPadding}
	{onMapPress}
	{zoomControls}
	{expandControl}
	{hideControl}
	{scrollZoom}
	{fitAnimate}
	{zoomControlsFrom}
	{zoomControlsClass}
	{zoomAround}
	{onMoveStart}
	{onMoveEnd}
	{attributionLabel}
	camera={{ center: [23.73, 37.98], zoom: 10 }}
	aria-label={ariaLabel}
	testId="map"
	class="h-map-h w-full"
>
	{#snippet pin(point, { selected })}
		<button
			type="button"
			class="size-touch"
			data-testid={`pin-${point.id}`}
			data-selected={selected}>{point.id}</button
		>
	{/snippet}
</MapView>
