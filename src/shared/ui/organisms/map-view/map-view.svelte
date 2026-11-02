<script lang="ts" module>
	import type { ExpressionSpecification } from 'maplibre-gl';
	import { controls, spacing, step } from '$shared/design/tokens';

	/** A point the map pins: the caller's id and its place. */
	export type MapViewPoint = { id: string; latitude: number; longitude: number };

	/** Where the camera starts before any point is fitted: `[longitude, latitude]` and the zoom. */
	export type MapViewCamera = { center: [number, number]; zoom: number };

	/** The room around the pins when the camera fits them: all sides, or each (what covers the map, e.g. a sheet). */
	export type MapViewPadding =
		| number
		| { top: number; right: number; bottom: number; left: number };

	/** U-27.2: the «+» / «−» buttons' names (the caller's words, in the page's language). */
	export type MapViewZoomControls = { zoomInLabel: string; zoomOutLabel: string };

	/**
	 * U-28.2: Airbnb's round «⤢» at the map's top right, over the zoom (from 1128): the caller owns `expanded` and lays
	 * the map out; while expanded the same button is the «×» that brings it back (its name and glyph change, the
	 * keyboard's focus stays on it).
	 */
	export type MapViewExpandControl = {
		expanded: boolean;
		expandLabel: string;
		collapseLabel: string;
		onExpandedChange: (expanded: boolean) => void;
		/**
		 * The zone it shows from: `laptop` (1128, the results' map beside the list, the default) or `tablet` (744: the
		 * profile's map, whose «⤢» opens its window, wave 1.5).
		 */
		from?: 'tablet' | 'laptop';
	};

	const expandFromClasses = { tablet: 'tablet:flex', laptop: 'laptop:flex' } as const;

	/** U-28.2: the «Απόκρυψη χάρτη» pill at the map's top left (from 1128; none while the map is expanded). */
	export type MapViewHideControl = { label: string; onHide: () => void };

	/** How close to its limit the zoom counts as there (the limit a step clamps to, read back as a float). */
	const ZOOM_LIMIT_EPSILON = 0.001;

	/**
	 * U-27.2 (f1b): the map's right column the «+» / «−» take while they show — 16 + the 40 pill + 16, 72: the camera
	 * keeps every pin out of it. U-28.2: the «⤢» sits in the same column, above the zoom.
	 */
	const ZOOM_COLUMN_WIDTH = step(4) + controls['control-sm'] + step(4);

	/** U-28.2: the top band the «Απόκρυψη χάρτη» pill takes while it shows — 16 + its 40 + 16, 72. */
	const HIDE_BAND_HEIGHT = step(4) + controls['control-sm'] + step(4);

	/** The room `padding` keeps, with at least the zoom's column on the right. */
	export function withZoomColumn(padding: MapViewPadding): MapViewPadding {
		const sides =
			typeof padding === 'number'
				? { top: padding, right: padding, bottom: padding, left: padding }
				: padding;
		return { ...sides, right: Math.max(sides.right, ZOOM_COLUMN_WIDTH) };
	}

	/** The room `padding` keeps, with at least the hide pill's band at the top. */
	export function withHideBand(padding: MapViewPadding): MapViewPadding {
		const sides =
			typeof padding === 'number'
				? { top: padding, right: padding, bottom: padding, left: padding }
				: padding;
		return { ...sides, top: Math.max(sides.top, HIDE_BAND_HEIGHT) };
	}

	/** The zoom a single pin (or a tight group) is fitted at, at most: a street, not a doorway. */
	export const MAP_VIEW_MAX_FIT_ZOOM = 15;

	/** The room kept around the pins when the camera fits them (the kit's `section`, 32). */
	export const MAP_VIEW_FIT_PADDING = spacing.section;

	/**
	 * The place names of a vector style in `language` first (the wave record §7.1: «`name:el` πρώτα»), the style's
	 * own `name` otherwise — the MapLibre expression a symbol layer's `text-field` takes.
	 */
	export function localizedNameField(language: string): ExpressionSpecification {
		return ['coalesce', ['get', `name:${language}`], ['get', 'name']];
	}

	/** Whether a symbol layer's `text-field` writes a place name (a road number or a house number is left alone). */
	export function writesPlaceName(textField: unknown): boolean {
		return textField != null && JSON.stringify(textField).includes('name');
	}

	/** The corners `[[west, south], [east, north]]` around the points, or `null` without any. */
	export function boundsOf(
		points: readonly MapViewPoint[]
	): [[number, number], [number, number]] | null {
		if (points.length === 0) return null;
		let west = Infinity;
		let south = Infinity;
		let east = -Infinity;
		let north = -Infinity;
		for (const { latitude, longitude } of points) {
			west = Math.min(west, longitude);
			east = Math.max(east, longitude);
			south = Math.min(south, latitude);
			north = Math.max(north, latitude);
		}
		return [
			[west, south],
			[east, north]
		];
	}
</script>

<script lang="ts" generics="Point extends MapViewPoint">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { untrack, type Snippet } from 'svelte';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		styleUrl,
		points,
		pin,
		selectedId = null,
		labelLanguage,
		camera,
		fitKey,
		fitPadding,
		onMapPress,
		zoomControls,
		expandControl,
		hideControl,
		scrollZoom = true,
		fitAnimate = false,
		'aria-label': ariaLabel,
		testId,
		class: className
	}: {
		/** The style (the app's ONE map config, `shared/config/map`); a new one is swapped in place. */
		styleUrl: string;
		/** What to pin; the camera fits them whenever the set changes. No point, no pin. */
		points: readonly Point[];
		/** Draws one pin (a `MapPricePin`), centred on its point. */
		pin: Snippet<[Point, { selected: boolean }]>;
		/** The pin drawn over the others. */
		selectedId?: string | null;
		/** The page's language: the place names in it first (`name:<language>`), the style's own otherwise. */
		labelLanguage?: string;
		/** Before any point: the region the map opens on. */
		camera: MapViewCamera;
		/**
		 * The camera fits the pins once per key (a new search): a later page of the same key adds pins without moving
		 * the camera the reader may have moved. Without it, every new set of points is fitted.
		 */
		fitKey?: string;
		/** The room around the pins when fitted, read at that moment (what covers the map then); 32 all round by default. */
		fitPadding?: () => MapViewPadding;
		/** A press on the map itself (not on a pin): e.g. the open pin card closes. */
		onMapPress?: () => void;
		/**
		 * U-27.2: Airbnb's «+» / «−» at the map's top right, from 744 only (below it the phone pinches, as Airbnb's);
		 * each steps the zoom on MapLibre's own motion and is disabled at its limit. None without it.
		 */
		zoomControls?: MapViewZoomControls;
		/**
		 * U-28.2: the round «⤢» over the zoom, from 1128 only (where a map sits beside other content; the zoom then
		 * steps 16 below it, at 72): the caller's state and words. None without it.
		 */
		expandControl?: MapViewExpandControl;
		/** U-28.2: the «Απόκρυψη χάρτη» pill at the top left, from 1128 only, never while expanded. None without it. */
		hideControl?: MapViewHideControl;
		/** The wheel zooms the map (the default); off, it scrolls the page over it (the profile's map, wave 1.5). */
		scrollZoom?: boolean;
		/**
		 * A later fit glides on MapLibre's own motion (the profile's pin moving to a new office, wave 1.5); the first
		 * fit is always at once. Off by default (a new search's pins appear in place).
		 */
		fitAnimate?: boolean;
		/** The map's name for assistive tech (a region). */
		'aria-label': string;
		testId?: string;
		/** Places and sizes the map (it fills what it is given). */
		class?: string;
	} = $props();

	let container = $state<HTMLDivElement | null>(null);
	let map = $state.raw<MapLibreMap | null>(null);
	let loaded = $state(false);
	/** Each point's place on the screen, in the map's own pixels. */
	let positions = $state.raw<Record<string, { x: number; y: number }>>({});
	/** U-27.2: the zoom stands at its least (the world fits) or its most: that button is disabled. */
	let atMinZoom = $state(false);
	let atMaxZoom = $state(false);
	/** The «+» / «−» column: drawn from 744 only (CSS), so a fit asks whether it shows. */
	let zoomNode = $state<HTMLElement | null>(null);
	/** U-28.2: the hide pill, drawn from 1128 only (CSS). */
	let hideNode = $state<HTMLElement | null>(null);
	const drawn = (node: HTMLElement | null) => node !== null && node.getClientRects().length > 0;

	/**
	 * The room around the pins when they are fitted: the caller's (32 by default), clear of the zoom's column while it
	 * shows and of the hide pill's band while it shows.
	 */
	function fitRoom(): MapViewPadding {
		let room = fitPadding?.() ?? MAP_VIEW_FIT_PADDING;
		if (drawn(zoomNode)) room = withZoomColumn(room);
		if (drawn(hideNode)) room = withHideBand(room);
		return room;
	}

	/** The hide pill shows while it is given and the map is not expanded (nothing then lies beside it). */
	const hideShown = $derived(hideControl !== undefined && !expandControl?.expanded);

	/** Reads where the zoom stands against its limits (the least one as the map's size allows it). */
	function readZoomLimits(instance: MapLibreMap) {
		const zoom = instance.getZoom();
		atMinZoom = zoom <= instance.getMinZoom(true) + ZOOM_LIMIT_EPSILON;
		atMaxZoom = zoom >= instance.getMaxZoom() - ZOOM_LIMIT_EPSILON;
	}

	/**
	 * One step in or out on MapLibre's own motion (its 500 ms ease). `essential`: the step moves whatever the
	 * device's motion setting (U-12.1), which MapLibre would otherwise read and skip.
	 */
	function zoomBy(direction: 'in' | 'out') {
		const instance = map;
		if (!instance) return;
		if (direction === 'in') instance.zoomIn({ essential: true });
		else instance.zoomOut({ essential: true });
	}

	/** Writes the place names in the page's language, for the style that just loaded. */
	function relabel(instance: MapLibreMap) {
		if (!labelLanguage) return;
		const field = localizedNameField(labelLanguage);
		for (const layer of instance.getStyle()?.layers ?? []) {
			if (layer.type !== 'symbol' || !writesPlaceName(layer.layout?.['text-field'])) continue;
			instance.setLayoutProperty(layer.id, 'text-field', field);
		}
	}

	/** Projects every point to the screen (on each move of the camera and each new set of points). */
	function project(instance: MapLibreMap, list: readonly Point[]) {
		const next: Record<string, { x: number; y: number }> = {};
		for (const point of list) {
			const at = instance.project([point.longitude, point.latitude]);
			next[point.id] = { x: at.x, y: at.y };
		}
		positions = next;
	}

	// 🔴 The map exists ONLY in the browser and only once its box is laid out (never during SSR: effects do not run
	// there; never before the page shows: the tiles are asked after the first paint). MapLibre and its worker are
	// loaded on demand (`import()`), so neither is in the page's first bundle; `remove()` frees the WebGL context.
	$effect(() => {
		const node = container;
		if (!node) return;
		let disposed = false;
		let started = false;
		let instance: MapLibreMap | null = null;

		async function start() {
			started = true;
			const [maplibre, worker] = await Promise.all([
				import('maplibre-gl'),
				import('maplibre-gl/dist/maplibre-gl-worker.mjs?url')
			]);
			if (disposed || !node) return;
			// The worker is its own file of the build (its address is resolved here, not by MapLibre's guess).
			maplibre.setWorkerUrl(worker.default);
			const initial = untrack(() => camera);
			const created = new maplibre.Map({
				container: node,
				style: untrack(() => styleUrl),
				center: initial.center,
				zoom: initial.zoom,
				// The data's credit stays (OpenStreetMap / OpenFreeMap), folded to its «i» on a narrow map.
				attributionControl: { compact: true },
				// MapLibre names its canvas itself («Map»): it takes the caller's name, in the page's language.
				locale: { 'Map.Title': untrack(() => ariaLabel) },
				dragRotate: false,
				pitchWithRotate: false,
				touchPitch: false,
				scrollZoom: untrack(() => scrollZoom)
			});
			instance = created;
			created.on('style.load', () => relabel(created));
			created.on('move', () =>
				project(
					created,
					untrack(() => points)
				)
			);
			created.on('resize', () => {
				project(
					created,
					untrack(() => points)
				);
				readZoomLimits(created);
			});
			created.on('zoom', () => readZoomLimits(created));
			created.on('click', () => untrack(() => onMapPress)?.());
			created.on('load', () => {
				loaded = true;
				project(
					created,
					untrack(() => points)
				);
				readZoomLimits(created);
			});
			map = created;
		}

		const laidOut = () => node.clientWidth > 0 && node.clientHeight > 0;
		const observer =
			typeof ResizeObserver === 'undefined'
				? null
				: new ResizeObserver(() => {
						if (!started && laidOut()) void start();
					});
		observer?.observe(node);
		if (laidOut()) void start();

		return () => {
			disposed = true;
			observer?.disconnect();
			instance?.remove();
			map = null;
			loaded = false;
			positions = {};
			atMinZoom = false;
			atMaxZoom = false;
		};
	});

	// A new style (the theme changed) is swapped in place; its `style.load` writes the names again.
	let shownStyle: string | null = null;
	$effect(() => {
		const url = styleUrl;
		const instance = map;
		if (!instance) return;
		if (shownStyle === null) shownStyle = url;
		else if (url !== shownStyle) {
			shownStyle = url;
			instance.setStyle(url);
		}
	});

	// NIT-r2-1: the page's language changes in place (`/doctors` ⇒ `/en/doctors` keeps this map): the canvas's name and
	// the place names follow it. The map was made with the first ones (`locale`, `style.load`): nothing is redone for
	// them; a style still loading writes the names itself on its `style.load`.
	let labelled: { map: MapLibreMap; language: string | undefined; name: string } | null = null;
	$effect(() => {
		const instance = map;
		const language = labelLanguage;
		const name = ariaLabel;
		if (!instance) return;
		untrack(() => {
			const previous = labelled?.map === instance ? labelled : null;
			labelled = { map: instance, language, name };
			if (!previous) return;
			if (name !== previous.name) instance.getCanvas().setAttribute('aria-label', name);
			if (language !== previous.language && instance.isStyleLoaded()) relabel(instance);
		});
	});

	// The camera fits the pins once per `fitKey` (a new search; without it, each new set of points), the room around
	// them read at that moment; the pins follow every set.
	let fittedKey: string | null = null;
	$effect(() => {
		const instance = map;
		const list = points;
		if (!instance || !loaded) return;
		project(instance, list);
		const key = fitKey ?? list.map((point) => point.id).join('|');
		const bounds = boundsOf(list);
		if (!bounds || key === fittedKey) return;
		const glide = fittedKey !== null && untrack(() => fitAnimate);
		fittedKey = key;
		instance.fitBounds(bounds, {
			padding: untrack(fitRoom),
			maxZoom: MAP_VIEW_MAX_FIT_ZOOM,
			// U-12.1: a glide moves whatever the device's motion setting (MapLibre would otherwise skip it).
			...(glide ? { essential: true } : { duration: 0 })
		});
	});
</script>

<!-- U-27.2: Airbnb's zoom (measured at 744 · 950 · 1128 · 1440): ONE upright pill 40 × 81 — «+» over «−», each 40, a
     1 px line between — 16 from the map's top and right, the card at 92.5 % (the theme's card in the dark theme), the
     full corner, the `overlay` shadow and a 1 px rim. The pill is drawn once behind the two 48 targets (the kit's
     touch box: each half sits in its own, no two overlap), the kit's focus ring on the half that has the focus.
     From 744 only; above the pins, in the map's own layers (`isolate`): what the page lays over the map stays above.
     U-28.2 (Airbnb, measured at 1128 · 1440 · 1920): from 1128 the round «⤢» is the column's first target — its 40
     circle 16 from the top and the right — and the zoom follows 8 under its 48 box, so the pill's top is at 72 (16
     under the circle); below 1128 the circle is not drawn and the zoom is back at 16. U-28.4: with a pointer, the
     half or the circle under it takes the kit's light fill (not while disabled). -->
{#snippet controlColumn()}
	<div
		bind:this={zoomNode}
		data-slot="map-view-zoom"
		class={cn(
			'absolute top-2 right-3 z-30 hidden flex-col gap-2',
			zoomControls ? 'tablet:flex' : 'laptop:flex'
		)}
	>
		{#if expandControl}
			{@render expandButton(expandControl)}
		{/if}
		{#if zoomControls}
			<div data-slot="map-view-zoom-group" class="relative flex flex-col">
				<span
					aria-hidden="true"
					data-slot="map-view-zoom-pill"
					class="pointer-events-none absolute top-2 left-1 flex w-control-sm flex-col overflow-hidden rounded-full bg-card/92.5 shadow-overlay ring-1 ring-foreground/2"
				>
					<span class="h-control-sm"></span>
					<span class="h-px bg-border"></span>
					<span class="h-control-sm"></span>
				</span>
				{@render zoomButton('in', zoomControls.zoomInLabel, atMaxZoom)}
				{@render zoomButton('out', zoomControls.zoomOutLabel, atMinZoom)}
			</div>
		{/if}
	</div>
{/snippet}

<!-- U-28.2: the «⤢» — the zoom's look, alone: the 40 circle of the card at 92.5 % with the `overlay` shadow and the 1 px
     rim, the 16 glyph, at the bottom of its 48 box (so the circle is 16 from the map's top). While expanded the same
     node is the «×» (`close`), named «Κλείσιμο …» by the caller. -->
{#snippet expandButton(control: MapViewExpandControl)}
	<button
		type="button"
		aria-label={control.expanded ? control.collapseLabel : control.expandLabel}
		data-slot="map-view-expand"
		data-expanded={control.expanded}
		class={cn(
			'group hidden size-touch items-end justify-center outline-none',
			expandFromClasses[control.from ?? 'laptop']
		)}
		onclick={() => control.onExpandedChange(!control.expanded)}
	>
		<span
			class="relative grid size-control-sm place-items-center rounded-full bg-card/92.5 shadow-overlay ring-1 ring-foreground/2 group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
		>
			<span
				data-slot="map-view-control-fill"
				class="absolute inset-0 rounded-full transition-colors duration-standard ease-standard can-hover:group-hover:bg-foreground/5"
			></span>
			<Ionicon
				name={control.expanded ? 'close' : 'expand-outline'}
				class="relative icon-sm text-foreground"
			/>
		</span>
	</button>
{/snippet}

<!-- U-28.2: «Απόκρυψη χάρτη» — the same look as a pill, 40 high with the 14/600 words, 16 from the map's top and left,
     at the bottom of its 48 box. -->
{#snippet hideButton(control: MapViewHideControl)}
	<button
		bind:this={hideNode}
		type="button"
		data-slot="map-view-hide"
		class="group absolute top-2 left-4 z-30 hidden min-h-touch min-w-touch items-end outline-none laptop:flex"
		onclick={() => control.onHide()}
	>
		<span
			class="relative flex min-h-control-sm items-center rounded-full bg-card/92.5 px-4 shadow-overlay ring-1 ring-foreground/2 group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
		>
			<span
				data-slot="map-view-control-fill"
				class="absolute inset-0 rounded-full transition-colors duration-standard ease-standard can-hover:group-hover:bg-foreground/5"
			></span>
			<span class="relative text-body-sm font-semibold whitespace-nowrap text-foreground"
				>{control.label}</span
			>
		</span>
	</button>
{/snippet}

{#snippet zoomButton(direction: 'in' | 'out', label: string, atLimit: boolean)}
	<button
		type="button"
		aria-label={label}
		data-slot={`map-view-zoom-${direction}`}
		disabled={atLimit}
		class={cn(
			'group relative flex size-touch justify-center outline-none',
			direction === 'in' ? 'items-end' : 'items-start pt-px'
		)}
		onclick={() => zoomBy(direction)}
	>
		<span
			class={cn(
				'grid size-control-sm place-items-center transition-colors duration-standard ease-standard group-focus-visible:ring-3 group-focus-visible:ring-ring/50 can-hover:group-enabled:group-hover:bg-foreground/5',
				direction === 'in' ? 'rounded-t-full' : 'rounded-b-full'
			)}
		>
			<Ionicon
				name={direction === 'in' ? 'add' : 'remove'}
				class="icon-sm text-foreground group-disabled:opacity-50"
			/>
		</span>
	</button>
{/snippet}

<!-- The kit's map (U-24.4, the wave record §7.1): MapLibre on the caller's style, the pins as the caller's own buttons
     over it (each centred on its point's projection, the selected one on top). The muted ground shows until the tiles
     arrive; the map fills the box the caller gives it and keeps its pins' layers to itself (`isolate`): what the
     caller lays over it (a sheet, the pin's card) is always above every pin. -->
<div
	role="region"
	aria-label={ariaLabel}
	data-slot="map-view"
	data-loaded={loaded}
	data-testid={testId}
	class={cn('relative isolate overflow-hidden bg-muted', className)}
>
	<!-- 🔴 MAJOR-1 (r1): MapLibre's own CSS (`.maplibregl-map { position: relative; overflow: hidden }`) is outside
	     every cascade layer, so it beats any utility on the node it manages: that node only fills (`size-full`); the
	     frame around it places it. -->
	<div data-slot="map-view-frame" class="absolute inset-0">
		<div bind:this={container} data-slot="map-view-canvas" class="size-full"></div>
	</div>
	<!-- The keyboard's order follows the reading order: the hide pill (top left), then the column (top right). -->
	{#if hideControl && hideShown}
		{@render hideButton(hideControl)}
	{/if}
	{#if zoomControls || expandControl}
		{@render controlColumn()}
	{/if}
	<div data-slot="map-view-pins" class="pointer-events-none absolute inset-0 overflow-hidden">
		{#each points as point (point.id)}
			{@const at = positions[point.id]}
			{#if at}
				<div
					data-slot="map-view-pin"
					data-id={point.id}
					class={cn(
						'pointer-events-auto absolute top-0 left-0',
						point.id === selectedId ? 'z-20' : 'z-0 has-[[data-state=hot]]:z-10'
					)}
					style="transform: translate({at.x}px, {at.y}px) translate(-50%, -50%)"
				>
					{@render pin(point, { selected: point.id === selectedId })}
				</div>
			{/if}
		{/each}
	</div>
</div>
