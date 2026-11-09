import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Harness from './map-view.harness.svelte';
import {
	boundsOf,
	localizedNameField,
	MAP_VIEW_FIT_PADDING,
	MAP_VIEW_MAX_FIT_ZOOM,
	withHideBand,
	withZoomColumn,
	writesPlaceName
} from './index';

type Handler = (event?: unknown) => void;

const { FakeMap, setWorkerUrl } = vi.hoisted(() => {
	class FakeMap {
		static instances: FakeMap[] = [];
		handlers = new Map<string, Handler[]>();
		setLayoutProperty = vi.fn();
		fitBounds = vi.fn();
		setStyle = vi.fn();
		remove = vi.fn();
		canvas = document.createElement('canvas');
		styleLoaded = true;
		// U-27.2: MapLibre's zoom (its default limits: the world fitting the box at 0.5 here, 22 at most).
		zoom = 10;
		minZoom = 0.5;
		maxZoom = 22;
		zoomIn = vi.fn();
		zoomOut = vi.fn();
		// The camera's centre (MapLibre's `LngLat`), moved by a test before it fires a move.
		center = { lng: 23.73, lat: 37.98 };
		constructor(public options: Record<string, unknown>) {
			FakeMap.instances.push(this);
		}
		getCanvas() {
			return this.canvas;
		}
		isStyleLoaded() {
			return this.styleLoaded;
		}
		getZoom() {
			return this.zoom;
		}
		getMinZoom() {
			return this.minZoom;
		}
		getMaxZoom() {
			return this.maxZoom;
		}
		on(event: string, handler: Handler) {
			this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
			return this;
		}
		emit(event: string, payload?: unknown) {
			for (const handler of this.handlers.get(event) ?? []) handler(payload);
		}
		getCenter() {
			return this.center;
		}
		getStyle() {
			return {
				layers: [
					{ id: 'water', type: 'fill' },
					{ id: 'place', type: 'symbol', layout: { 'text-field': ['get', 'name:latin'] } },
					{ id: 'road-shield', type: 'symbol', layout: { 'text-field': '{ref}' } },
					{ id: 'housenumber', type: 'symbol', layout: { 'text-field': '{housenumber}' } }
				]
			};
		}
		project([lng, lat]: [number, number]) {
			return { x: lng * 10, y: lat * 10 };
		}
	}
	return { FakeMap, setWorkerUrl: vi.fn() };
});

vi.mock('maplibre-gl', () => ({ Map: FakeMap, setWorkerUrl }));
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?url', () => ({ default: '/assets/worker.mjs' }));

const points = [
	{ id: 'a', latitude: 37.98, longitude: 23.73 },
	{ id: 'b', latitude: 37.94, longitude: 23.65 }
];

const laidOut = (width: number) => {
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(width);
};

const created = async () => {
	await waitFor(() => expect(FakeMap.instances).toHaveLength(1));
	return FakeMap.instances[0];
};

describe('MapView', () => {
	beforeEach(() => {
		FakeMap.instances = [];
	});
	afterEach(() => vi.restoreAllMocks());

	it('U-24.4: made only in the browser once laid out — MapLibre on demand, the ONE style, the data credit kept, its worker file', async () => {
		laidOut(320);
		render(Harness, { props: { styleUrl: 'https://tiles.example/styles/light', points } });
		const map = await created();
		expect(map.options).toMatchObject({
			style: 'https://tiles.example/styles/light',
			center: [23.73, 37.98],
			zoom: 10,
			attributionControl: { compact: true },
			dragRotate: false,
			// MINOR-8 (δ, r1): MapLibre's own canvas name is the caller's, never its English «Map».
			locale: { 'Map.Title': 'Χάρτης' }
		});
		expect(map.options.container).toBe(document.querySelector('[data-slot="map-view-canvas"]'));
		expect(setWorkerUrl).toHaveBeenCalledWith('/assets/worker.mjs');
		expect(screen.getByRole('region', { name: 'Χάρτης' })).toHaveAttribute('data-loaded', 'false');
	});

	it('review w3-w4 R1 MINOR-5 (U-81.2): the credit’s «i» takes the caller’s name in the page’s language; (negative) without one nothing else is named', async () => {
		laidOut(320);
		const named = render(Harness, { props: { points, attributionLabel: 'Πηγές του χάρτη' } });
		expect((await created()).options.locale).toEqual({
			'Map.Title': 'Χάρτης',
			'AttributionControl.ToggleAttribution': 'Πηγές του χάρτη'
		});
		named.unmount();
		FakeMap.instances = [];
		render(Harness, { props: { points } });
		expect((await created()).options.locale).toEqual({ 'Map.Title': 'Χάρτης' });
	});

	it('Α6: MapLibre’s compact credit starts folded, by its own press; what a person opened afterwards stays open', async () => {
		laidOut(320);
		render(Harness, { props: { styleUrl: 'https://tiles.example/styles/light', points } });
		const map = await created();
		map.emit('styledata');
		const node = map.options.container as HTMLElement;
		const box = document.createElement('details');
		box.className = 'maplibregl-ctrl-attrib maplibregl-compact maplibregl-compact-show';
		const press = document.createElement('summary');
		press.className = 'maplibregl-ctrl-attrib-button';
		const onPress = vi.fn();
		const onBubble = vi.fn();
		press.addEventListener('click', onPress);
		node.addEventListener('click', onBubble);
		box.append(press);
		node.append(box);
		map.emit('sourcedata');
		expect(onPress).toHaveBeenCalledOnce();
		// The press stays on the control: a page around the map hears nothing.
		expect(onBubble).not.toHaveBeenCalled();
		map.emit('sourcedata');
		map.emit('styledata');
		expect(onPress).toHaveBeenCalledOnce();
	});

	it('U-24.4: Greek place names — `name:el` first on the symbol layers that write a name, road numbers left alone', async () => {
		laidOut(320);
		render(Harness, { props: { labelLanguage: 'el' } });
		const map = await created();
		map.emit('style.load');
		expect(map.setLayoutProperty).toHaveBeenCalledTimes(1);
		expect(map.setLayoutProperty).toHaveBeenCalledWith('place', 'text-field', [
			'coalesce',
			['get', 'name:el'],
			['get', 'name']
		]);
	});

	it('U-24.4 (NIT-r2-1): the page’s language changed in place — the canvas takes the new name and the place names are written again in it', async () => {
		laidOut(320);
		const { rerender } = render(Harness, { props: { labelLanguage: 'el' } });
		const map = await created();
		map.emit('style.load');
		expect(map.setLayoutProperty).toHaveBeenCalledTimes(1);
		await rerender({ labelLanguage: 'en', ariaLabel: 'Map of the doctors in the list' });
		expect(map.canvas).toHaveAttribute('aria-label', 'Map of the doctors in the list');
		expect(map.setLayoutProperty).toHaveBeenCalledTimes(2);
		expect(map.setLayoutProperty).toHaveBeenLastCalledWith('place', 'text-field', [
			'coalesce',
			['get', 'name:en'],
			['get', 'name']
		]);
		// A style still loading writes the names itself, in the language of that moment.
		map.styleLoaded = false;
		await rerender({ labelLanguage: 'el', ariaLabel: 'Χάρτης' });
		expect(map.setLayoutProperty).toHaveBeenCalledTimes(2);
		map.emit('style.load');
		expect(map.setLayoutProperty).toHaveBeenLastCalledWith('place', 'text-field', [
			'coalesce',
			['get', 'name:el'],
			['get', 'name']
		]);
	});

	it('U-24.4 (negative, NIT-r2-1): without a change of language nothing is written again beyond the style’s own `style.load`', async () => {
		laidOut(320);
		const { rerender } = render(Harness, { props: { labelLanguage: 'el', points } });
		const map = await created();
		map.emit('style.load');
		map.emit('load');
		await rerender({ labelLanguage: 'el', points: points.slice(0, 1), selectedId: 'a' });
		await rerender({ labelLanguage: 'el', styleUrl: 'https://tiles.example/styles/dark' });
		expect(map.setLayoutProperty).toHaveBeenCalledTimes(1);
		// The name MapLibre was made with (its `locale`) is not set a second time.
		expect(map.canvas).not.toHaveAttribute('aria-label');
	});

	it('U-24.4: one pin per point, centred on its projection, the selected one on top; the camera fits them', async () => {
		laidOut(320);
		render(Harness, { props: { points, selectedId: 'b' } });
		const map = await created();
		map.emit('load');
		await waitFor(() => expect(screen.getByTestId('pin-a')).toBeInTheDocument());
		const wrapper = (id: string) => screen.getByTestId(`pin-${id}`).parentElement as HTMLElement;
		expect(wrapper('a').getAttribute('style')).toMatch(
			/translate\(237\.3\d*px, 379\.\d+px\) translate\(-50%, -50%\)/
		);
		expect(wrapper('b')).toHaveClass('z-20');
		expect(screen.getByTestId('pin-b')).toHaveAttribute('data-selected', 'true');
		expect(map.fitBounds).toHaveBeenCalledWith(
			[
				[23.65, 37.94],
				[23.73, 37.98]
			],
			{ padding: MAP_VIEW_FIT_PADDING, maxZoom: MAP_VIEW_MAX_FIT_ZOOM, duration: 0 }
		);
		// The pins' layers stay inside the map: what the page lays over it is above every pin.
		expect(screen.getByRole('region', { name: 'Χάρτης' })).toHaveClass('isolate');
	});

	it('U-24.4: a new style (the theme) is swapped in place; the map is removed with the page', async () => {
		laidOut(320);
		const { rerender, unmount: leave } = render(Harness, {
			props: { styleUrl: 'https://tiles.example/styles/light' }
		});
		const map = await created();
		await rerender({ styleUrl: 'https://tiles.example/styles/dark' });
		expect(map.setStyle).toHaveBeenCalledWith('https://tiles.example/styles/dark');
		leave();
		expect(map.remove).toHaveBeenCalledOnce();
	});

	it('U-24.4: a press on the map itself reaches the caller (it closes the pin card)', async () => {
		laidOut(320);
		const onMapPress = vi.fn();
		render(Harness, { props: { onMapPress } });
		const map = await created();
		map.emit('click');
		expect(onMapPress).toHaveBeenCalledOnce();
	});

	it('U-24.4 (negative): a box with no size (a hidden map, 744–1127) makes no map and asks no tile', async () => {
		laidOut(0);
		render(Harness, { props: { points } });
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(FakeMap.instances).toHaveLength(0);
		expect(document.querySelector('[data-slot="map-view-pin"]')).toBeNull();
	});

	it('U-24.4 (negative): the page before any effect (the server render, hydration) has no map and no pin', () => {
		laidOut(320);
		const target = document.body.appendChild(document.createElement('div'));
		const app = mount(Harness, { target, props: { points } });
		expect(FakeMap.instances).toHaveLength(0);
		expect(target.querySelector('[data-slot="map-view"]')).toHaveAttribute('data-loaded', 'false');
		expect(target.querySelector('[data-slot="map-view-pin"]')).toBeNull();
		flushSync(() => unmount(app));
	});
});

/**
 * 🔴 MAJOR-1 (r1, the live L-1: the map never showed). MapLibre's CSS sets `.maplibregl-map` outside every cascade
 * layer, so it beats ANY utility of Tailwind 4 (`@layer utilities`) on the node it manages: `absolute inset-0` there
 * became `position: relative`, 0 high. The managed node may carry no utility of a property that rule sets.
 */
// NIT-r2-3: a variant's utility (`tablet:relative`) is lost the same way: each family is matched after any prefix.
const UTILITY_FAMILIES: Record<string, RegExp> = {
	position: /(^|:)(absolute|relative|fixed|sticky|static)$/,
	overflow: /(^|:)overflow(-[xy])?-/,
	font: /(^|:)(font-|text-(display|heading|title|body|label)-|leading-)/
};

/** The properties MapLibre's CSS gives the node it manages, read from the installed stylesheet. */
function managedNodeProperties(): string[] {
	const css = readFileSync(
		join(process.cwd(), 'node_modules/maplibre-gl/dist/maplibre-gl.css'),
		'utf8'
	);
	const rule = /\.maplibregl-map\{([^}]*)\}/.exec(css)?.[1] ?? '';
	return rule
		.split(';')
		.map((declaration) => declaration.split(':')[0].trim())
		.filter(Boolean);
}

/** The classes of a node that MapLibre's unlayered CSS would silently override. */
function overriddenUtilities(classes: string, properties: string[]): string[] {
	return classes
		.split(/\s+/)
		.filter(Boolean)
		.filter((name) => properties.some((property) => UTILITY_FAMILIES[property]?.test(name)));
}

describe('MapView: the node MapLibre manages (MAJOR-1, r1)', () => {
	beforeEach(() => {
		FakeMap.instances = [];
	});
	afterEach(() => vi.restoreAllMocks());

	it('U-24.4: the node MapLibre manages carries none of the properties its CSS sets — it only fills, its frame places it', async () => {
		const properties = managedNodeProperties();
		expect(properties).toEqual(expect.arrayContaining(['position', 'overflow']));
		laidOut(320);
		render(Harness, { props: { points } });
		const map = await created();
		const container = map.options.container as HTMLElement;
		expect(overriddenUtilities(container.className, properties)).toEqual([]);
		expect(container).toHaveClass('size-full');
		expect(container.parentElement).toHaveAttribute('data-slot', 'map-view-frame');
		expect(container.parentElement).toHaveClass('absolute', 'inset-0');
	});

	it('U-24.4 (negative): the r0 node (`absolute inset-0`) is reported — MapLibre’s `position: relative` would win', () => {
		expect(overriddenUtilities('absolute inset-0', managedNodeProperties())).toEqual(['absolute']);
		expect(
			overriddenUtilities('relative overflow-hidden text-body-sm', managedNodeProperties())
		).toEqual(['relative', 'overflow-hidden', 'text-body-sm']);
	});

	it('U-24.4 (negative, NIT-r2-3): a utility behind a variant (`tablet:relative`, `laptop:overflow-auto`) is reported too — `size-full` and the frame’s classes are not', () => {
		expect(
			overriddenUtilities(
				'size-full tablet:relative laptop:overflow-auto dark:font-semibold',
				managedNodeProperties()
			)
		).toEqual(['tablet:relative', 'laptop:overflow-auto', 'dark:font-semibold']);
		expect(overriddenUtilities('size-full rounded-lg bg-muted', managedNodeProperties())).toEqual(
			[]
		);
	});

	it('NIT-8 (r1): the camera fits once per key — a next page of the same search adds pins without moving it; the room is read when it fits', async () => {
		laidOut(320);
		const room = { top: 32, right: 32, bottom: 232, left: 32 };
		const { rerender } = render(Harness, {
			props: { points: points.slice(0, 1), fitKey: 'search-1', fitPadding: () => room }
		});
		const map = await created();
		map.emit('load');
		await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(1));
		expect(map.fitBounds.mock.calls[0][1]).toMatchObject({ padding: room });
		await rerender({ points, fitKey: 'search-1', fitPadding: () => room });
		await waitFor(() => expect(screen.getByTestId('pin-b')).toBeInTheDocument());
		expect(map.fitBounds).toHaveBeenCalledTimes(1);
		await rerender({ points, fitKey: 'search-2', fitPadding: () => room });
		await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(2));
	});
});

describe('MapView (wave 1.5, the profile’s map)', () => {
	beforeEach(() => {
		FakeMap.instances = [];
	});
	afterEach(() => vi.restoreAllMocks());

	it('Π6 (wave 1.5): the profile’s map lets the wheel scroll the page (`scrollZoom` off); by default the wheel zooms the map', async () => {
		laidOut(320);
		const profile = render(Harness, { props: { points, scrollZoom: false } });
		expect((await created()).options).toMatchObject({ scrollZoom: false });
		profile.unmount();
		FakeMap.instances = [];
		render(Harness, { props: { points } });
		expect((await created()).options).toMatchObject({ scrollZoom: true });
	});

	it('U-39.1 (wave 1.5): with `fitAnimate` a new office’s pin glides in on MapLibre’s motion, whatever the motion setting; the first fit is at once', async () => {
		laidOut(320);
		const { rerender } = render(Harness, {
			props: { points: points.slice(0, 1), fitKey: 'off-1', fitAnimate: true }
		});
		const map = await created();
		map.emit('load');
		await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(1));
		expect(map.fitBounds.mock.calls[0][1]).toMatchObject({ duration: 0 });
		await rerender({ points: points.slice(1), fitKey: 'off-2', fitAnimate: true });
		await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(2));
		expect(map.fitBounds.mock.calls[1][1]).toMatchObject({ essential: true });
		expect(map.fitBounds.mock.calls[1][1]).not.toHaveProperty('duration');
	});

	it("U-28.2 (wave 1.5): the «⤢» shows from 744 on the profile (`from: 'tablet'`), from 1128 by default", () => {
		const control = (from?: 'tablet' | 'laptop') => ({
			expanded: false,
			expandLabel: 'Εμφάνιση',
			collapseLabel: 'Κλείσιμο',
			onExpandedChange: vi.fn(),
			...(from ? { from } : {})
		});
		const profile = render(Harness, { props: { expandControl: control('tablet') } });
		expect(screen.getByRole('button', { name: 'Εμφάνιση' })).toHaveClass('hidden', 'tablet:flex');
		profile.unmount();
		render(Harness, { props: { expandControl: control() } });
		expect(screen.getByRole('button', { name: 'Εμφάνιση' })).toHaveClass('hidden', 'laptop:flex');
	});
});

describe('map-view helpers', () => {
	it('U-24.4: the names of a style in the page’s language first, the style’s own otherwise', () => {
		expect(localizedNameField('en')).toEqual(['coalesce', ['get', 'name:en'], ['get', 'name']]);
		expect(writesPlaceName(['get', 'name:latin'])).toBe(true);
		expect(writesPlaceName('{ref}')).toBe(false);
		expect(writesPlaceName(undefined)).toBe(false);
	});

	it('U-24.4: the corners around the points; none without any', () => {
		expect(boundsOf(points)).toEqual([
			[23.65, 37.94],
			[23.73, 37.98]
		]);
		expect(boundsOf([])).toBeNull();
	});
});

describe('MapView: the zoom buttons (U-27.2)', () => {
	beforeEach(() => {
		FakeMap.instances = [];
	});
	afterEach(() => vi.restoreAllMocks());

	const zoomControls = { zoomInLabel: 'Μεγέθυνση', zoomOutLabel: 'Σμίκρυνση' };
	const zoomIn = () => screen.getByRole('button', { name: 'Μεγέθυνση' });
	const zoomOut = () => screen.getByRole('button', { name: 'Σμίκρυνση' });

	it('U-27.2: two named buttons, «+» over «−», in Airbnb’s pill (40 × 81: two 40 halves and the 1 px line), 16 from the top and the right, hidden below 744', () => {
		render(Harness, { props: { zoomControls } });
		const group = document.querySelector('[data-slot="map-view-zoom"]') as HTMLElement;
		expect(group).toHaveClass('absolute', 'top-2', 'right-3', 'hidden', 'tablet:flex', 'flex-col');
		const [first, second] = group.querySelectorAll('button');
		expect(first).toBe(zoomIn());
		expect(second).toBe(zoomOut());
		expect(first.querySelector('[data-icon="add"]')).toHaveClass('icon-sm', 'text-foreground');
		expect(second.querySelector('[data-icon="remove"]')).toHaveClass('icon-sm', 'text-foreground');
		// Each a 48 target (the kit's), none over the other; the visible halves are 40.
		for (const button of [first, second]) {
			expect(button).toHaveClass('size-touch');
			expect(button.firstElementChild).toHaveClass('size-control-sm');
		}
		expect(first).toHaveClass('items-end');
		expect(second).toHaveClass('items-start', 'pt-px');
		// The ONE pill behind them: 8 + 8 = 16 from the top, 12 + 4 = 16 from the right; 40 + 1 + 40.
		const pill = group.querySelector('[data-slot="map-view-zoom-pill"]') as HTMLElement;
		expect(pill).toHaveAttribute('aria-hidden', 'true');
		expect(pill).toHaveClass(
			'top-2',
			'left-1',
			'w-control-sm',
			'rounded-full',
			'bg-card/92.5',
			'shadow-overlay',
			'ring-1',
			'pointer-events-none'
		);
		expect([...pill.children].map((part) => part.className)).toEqual([
			'h-control-sm',
			'h-px bg-border',
			'h-control-sm'
		]);
		// Above the pins, inside the map's own layers.
		expect(group).toHaveClass('z-30');
		expect(screen.getByRole('region', { name: 'Χάρτης' })).toHaveClass('isolate');
	});

	it('U-27.2: a press steps MapLibre’s zoom on its own motion — and moves whatever the device’s motion setting (U-12.1: `essential`)', async () => {
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(320);
		render(Harness, { props: { zoomControls } });
		const map = await created();
		map.emit('load');
		const user = userEvent.setup({ delay: null });
		await user.click(zoomIn());
		expect(map.zoomIn).toHaveBeenCalledWith({ essential: true });
		await user.click(zoomOut());
		expect(map.zoomOut).toHaveBeenCalledWith({ essential: true });
		expect(map.zoomIn).toHaveBeenCalledTimes(1);
	});

	it('U-27.2: at the most zoom «+» is disabled, at the least «−» (the world fitting the box); between them both press', async () => {
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(320);
		render(Harness, { props: { zoomControls } });
		const map = await created();
		map.emit('load');
		await waitFor(() => expect(zoomIn()).toBeEnabled());
		expect(zoomOut()).toBeEnabled();
		map.zoom = 22;
		map.emit('zoom');
		await waitFor(() => expect(zoomIn()).toBeDisabled());
		expect(zoomOut()).toBeEnabled();
		map.zoom = 0.5;
		map.emit('zoom');
		await waitFor(() => expect(zoomOut()).toBeDisabled());
		expect(zoomIn()).toBeEnabled();
		// A bigger box lets the world fit further out: the limit is read again on a resize.
		map.minZoom = 0;
		map.emit('resize');
		await waitFor(() => expect(zoomOut()).toBeEnabled());
		// A disabled one is no step at all.
		map.zoom = 22;
		map.emit('zoom');
		await waitFor(() => expect(zoomIn()).toBeDisabled());
		await userEvent.setup({ delay: null }).click(zoomIn());
		expect(map.zoomIn).not.toHaveBeenCalled();
	});

	it('U-27.2: the keyboard reaches them (after the map’s canvas: «+», «−», then the pins) and draws the kit’s ring on the half it is on', async () => {
		laidOut(320);
		render(Harness, { props: { zoomControls, points } });
		const map = await created();
		map.emit('load');
		await waitFor(() => expect(screen.getByTestId('pin-b')).toBeInTheDocument());
		const buttons = [...document.querySelectorAll('[data-slot="map-view"] button')];
		expect(buttons).toEqual([
			zoomIn(),
			zoomOut(),
			screen.getByTestId('pin-a'),
			screen.getByTestId('pin-b')
		]);
		for (const button of [zoomIn(), zoomOut()]) {
			expect(button).not.toHaveAttribute('tabindex');
			expect(button.firstElementChild).toHaveClass(
				'group-focus-visible:ring-3',
				'group-focus-visible:ring-ring/50'
			);
		}
		expect(zoomIn().firstElementChild).toHaveClass('rounded-t-full');
		expect(zoomOut().firstElementChild).toHaveClass('rounded-b-full');
	});

	/** The zoom's column as CSS draws it from 744 (jsdom draws no box: one rect stands for it). */
	function zoomDrawn(drawn: boolean) {
		const real = HTMLElement.prototype.getClientRects;
		vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (
			this: HTMLElement
		) {
			if (this.dataset.slot === 'map-view-zoom')
				return (drawn ? [new DOMRect(0, 0, 48, 96)] : []) as unknown as DOMRectList;
			return real.call(this);
		});
	}

	it('U-27.2 (f1b): while the «+» / «−» show, the camera keeps their column (16 + 40 + 16 = 72) clear of pins on the right — the caller’s room kept on the other sides', async () => {
		laidOut(320);
		zoomDrawn(true);
		const room = { top: 32, right: 32, bottom: 232, left: 32 };
		const { rerender } = render(Harness, {
			props: { zoomControls, points, fitKey: 'search-1', fitPadding: () => room }
		});
		const map = await created();
		map.emit('load');
		await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(1));
		expect(map.fitBounds.mock.calls[0][1]).toMatchObject({
			padding: { top: 32, right: 72, bottom: 232, left: 32 }
		});
		// The default room (32 all round) takes the column too; a wider right room of the caller stays.
		await rerender({ zoomControls, points, fitKey: 'search-2', fitPadding: undefined });
		await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(2));
		expect(map.fitBounds.mock.calls[1][1]).toMatchObject({
			padding: { top: 32, right: 72, bottom: 32, left: 32 }
		});
		expect(withZoomColumn({ top: 0, right: 120, bottom: 0, left: 0 })).toEqual({
			top: 0,
			right: 120,
			bottom: 0,
			left: 0
		});
	});

	it('U-27.2 (negative, f1b): below 744 (the buttons not drawn) and without `zoomControls` the room is the caller’s, as before', async () => {
		laidOut(320);
		zoomDrawn(false);
		const room = { top: 32, right: 32, bottom: 232, left: 32 };
		const view = render(Harness, {
			props: { zoomControls, points, fitKey: 'search-1', fitPadding: () => room }
		});
		const map = await created();
		map.emit('load');
		await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(1));
		expect(map.fitBounds.mock.calls[0][1]).toMatchObject({ padding: room });
		view.unmount();
		FakeMap.instances = [];
		zoomDrawn(true);
		render(Harness, { props: { points } });
		const plain = await created();
		plain.emit('load');
		await waitFor(() => expect(plain.fitBounds).toHaveBeenCalledTimes(1));
		expect(plain.fitBounds.mock.calls[0][1]).toMatchObject({ padding: MAP_VIEW_FIT_PADDING });
	});

	it('U-27.2 (negative): without `zoomControls` the map has no zoom buttons (the profile’s map, wave 1.5)', () => {
		render(Harness);
		expect(document.querySelector('[data-slot="map-view-zoom"]')).toBeNull();
		expect(screen.queryByRole('button', { name: 'Μεγέθυνση' })).toBeNull();
	});
});

describe('MapView: the layout controls (U-28.2)', () => {
	beforeEach(() => {
		FakeMap.instances = [];
	});
	afterEach(() => vi.restoreAllMocks());

	const zoomControls = { zoomInLabel: 'Μεγέθυνση', zoomOutLabel: 'Σμίκρυνση' };
	const expandLabels = {
		expandLabel: 'Χάρτης σε πλήρη οθόνη',
		collapseLabel: 'Κλείσιμο χάρτη πλήρους οθόνης'
	};
	const expandOf = (expanded: boolean, onExpandedChange = vi.fn()) => ({
		expanded,
		...expandLabels,
		onExpandedChange
	});
	const hideOf = (onHide = vi.fn()) => ({ label: 'Απόκρυψη χάρτη', onHide });
	const user = () => userEvent.setup({ delay: null });

	it('U-28.2: «Χάρτης σε πλήρη οθόνη» is the right column’s first target from 1128 — the zoom’s look in a 40 circle, 16 from the top and the right, and the zoom follows 8 under its 48 box (its pill at 72)', () => {
		render(Harness, { props: { zoomControls, expandControl: expandOf(false) } });
		const column = document.querySelector('[data-slot="map-view-zoom"]') as HTMLElement;
		expect(column).toHaveClass('absolute', 'top-2', 'right-3', 'flex-col', 'gap-2', 'tablet:flex');
		const expand = screen.getByRole('button', { name: 'Χάρτης σε πλήρη οθόνη' });
		expect(column.firstElementChild).toBe(expand);
		// From 1128 only; the circle at the bottom of its 48 box: 8 + 8 = 16 from the top, 12 + 4 = 16 from the right.
		expect(expand).toHaveClass(
			'hidden',
			'laptop:flex',
			'size-touch',
			'items-end',
			'justify-center'
		);
		const circle = expand.firstElementChild as HTMLElement;
		expect(circle).toHaveClass(
			'size-control-sm',
			'rounded-full',
			'bg-card/92.5',
			'shadow-overlay',
			'ring-1',
			'ring-foreground/2'
		);
		expect(expand.querySelector('[data-icon="expand-outline"]')).toHaveClass('icon-sm');
		// The zoom: the next item of the column (8 under the 48 box: 8 + 48 + 8 + 8 = 72 to its pill), unchanged.
		const group = column.lastElementChild as HTMLElement;
		expect(group).toHaveAttribute('data-slot', 'map-view-zoom-group');
		expect(group).toContainElement(screen.getByRole('button', { name: 'Μεγέθυνση' }));
		expect(group.querySelector('[data-slot="map-view-zoom-pill"]')).toHaveClass('top-2', 'left-1');
	});

	it('U-28.2: pressed, it asks for the whole stage; expanded, the SAME node is «Κλείσιμο χάρτη πλήρους οθόνης» with the «×», and its press asks for the split — the focus stays on it', async () => {
		const onExpandedChange = vi.fn();
		const { rerender } = render(Harness, {
			props: { zoomControls, expandControl: expandOf(false, onExpandedChange) }
		});
		const expand = screen.getByRole('button', { name: 'Χάρτης σε πλήρη οθόνη' });
		await user().click(expand);
		expect(onExpandedChange).toHaveBeenLastCalledWith(true);
		expect(expand).toHaveFocus();
		await rerender({ zoomControls, expandControl: expandOf(true, onExpandedChange) });
		const close = screen.getByRole('button', { name: 'Κλείσιμο χάρτη πλήρους οθόνης' });
		expect(close).toBe(expand);
		expect(close).toHaveFocus();
		expect(close).toHaveAttribute('data-expanded', 'true');
		expect(close.querySelector('[data-icon="close"]')).toHaveClass('icon-sm');
		expect(close.querySelector('[data-icon="expand-outline"]')).toBeNull();
		await user().click(close);
		expect(onExpandedChange).toHaveBeenLastCalledWith(false);
	});

	it('U-28.2: «Απόκρυψη χάρτη» is the pill at the top left — 16 / 16, 40 high, the 14/600 words in the same look — from 1128; its press reaches the caller', async () => {
		const onHide = vi.fn();
		render(Harness, { props: { zoomControls, hideControl: hideOf(onHide) } });
		const hide = screen.getByRole('button', { name: 'Απόκρυψη χάρτη' });
		expect(hide).toHaveAttribute('data-slot', 'map-view-hide');
		// The 48 box at 8 / 16, the 40 pill at its bottom: 16 from the top and 16 from the left.
		expect(hide).toHaveClass(
			'absolute',
			'top-2',
			'left-4',
			'z-30',
			'hidden',
			'laptop:flex',
			'min-h-touch',
			'min-w-touch',
			'items-end'
		);
		const pill = hide.firstElementChild as HTMLElement;
		expect(pill).toHaveClass(
			'min-h-control-sm',
			'rounded-full',
			'bg-card/92.5',
			'px-4',
			'shadow-overlay',
			'ring-1',
			'ring-foreground/2'
		);
		expect(screen.getByText('Απόκρυψη χάρτη')).toHaveClass(
			'text-body-sm',
			'font-semibold',
			'text-foreground'
		);
		await user().click(hide);
		expect(onHide).toHaveBeenCalledOnce();
	});

	it('U-28.2: the keyboard meets them in the reading order — «Απόκρυψη χάρτη» (top left), «⤢», «+», «−», then the pins', async () => {
		laidOut(320);
		render(Harness, {
			props: { zoomControls, points, expandControl: expandOf(false), hideControl: hideOf() }
		});
		const map = await created();
		map.emit('load');
		await waitFor(() => expect(screen.getByTestId('pin-b')).toBeInTheDocument());
		expect([...document.querySelectorAll('[data-slot="map-view"] button')]).toEqual([
			screen.getByRole('button', { name: 'Απόκρυψη χάρτη' }),
			screen.getByRole('button', { name: 'Χάρτης σε πλήρη οθόνη' }),
			screen.getByRole('button', { name: 'Μεγέθυνση' }),
			screen.getByRole('button', { name: 'Σμίκρυνση' }),
			screen.getByTestId('pin-a'),
			screen.getByTestId('pin-b')
		]);
	});

	it('U-28.2 (negative): expanded, «Απόκρυψη χάρτη» is not drawn (nothing lies beside the map); without the options there is neither button (the profile’s map)', async () => {
		const { rerender } = render(Harness, {
			props: { zoomControls, expandControl: expandOf(true), hideControl: hideOf() }
		});
		expect(screen.queryByRole('button', { name: 'Απόκρυψη χάρτη' })).toBeNull();
		await rerender({ zoomControls, expandControl: expandOf(false), hideControl: hideOf() });
		expect(screen.getByRole('button', { name: 'Απόκρυψη χάρτη' })).toBeInTheDocument();
		await rerender({ zoomControls, expandControl: undefined, hideControl: undefined });
		expect(document.querySelector('[data-slot="map-view-expand"]')).toBeNull();
		expect(document.querySelector('[data-slot="map-view-hide"]')).toBeNull();
	});

	it('U-28.2 (negative, below 1128): the circle and the pill are `laptop:` only, so from 744 the zoom stands alone at 16 — the column’s gap applies to no hidden item; with the circle alone the column itself shows from 1128', () => {
		const { unmount: leave } = render(Harness, {
			props: { zoomControls, expandControl: expandOf(false), hideControl: hideOf() }
		});
		for (const slot of ['map-view-expand', 'map-view-hide']) {
			const node = document.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
			expect(node).toHaveClass('hidden', 'laptop:flex');
			expect([...node.classList].filter((name) => /^(tablet|split):/.test(name))).toEqual([]);
		}
		leave();
		render(Harness, { props: { expandControl: expandOf(false) } });
		const column = document.querySelector('[data-slot="map-view-zoom"]') as HTMLElement;
		expect(column).toHaveClass('hidden', 'laptop:flex');
		expect(column).not.toHaveClass('tablet:flex');
		expect(column.querySelector('[data-slot="map-view-zoom-group"]')).toBeNull();
	});

	it('U-28.2: while the hide pill shows, a fit keeps its band (16 + 40 + 16 = 72) clear of pins at the top — with the zoom’s 72 column on the right; neither while they are not drawn', async () => {
		laidOut(320);
		const real = HTMLElement.prototype.getClientRects;
		let drawn = true;
		vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (
			this: HTMLElement
		) {
			if (this.dataset.slot === 'map-view-zoom' || this.dataset.slot === 'map-view-hide')
				return (drawn ? [new DOMRect(0, 0, 48, 48)] : []) as unknown as DOMRectList;
			return real.call(this);
		});
		const room = { top: 32, right: 32, bottom: 32, left: 32 };
		const { rerender } = render(Harness, {
			props: {
				zoomControls,
				points,
				fitKey: 'search-1',
				fitPadding: () => room,
				expandControl: expandOf(false),
				hideControl: hideOf()
			}
		});
		const map = await created();
		map.emit('load');
		await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(1));
		expect(map.fitBounds.mock.calls[0][1]).toMatchObject({
			padding: { top: 72, right: 72, bottom: 32, left: 32 }
		});
		drawn = false;
		await rerender({
			zoomControls,
			points,
			fitKey: 'search-2',
			fitPadding: () => room,
			expandControl: expandOf(false),
			hideControl: hideOf()
		});
		await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(2));
		expect(map.fitBounds.mock.calls[1][1]).toMatchObject({ padding: room });
		expect(withHideBand(32)).toEqual({ top: 72, right: 32, bottom: 32, left: 32 });
		expect(withHideBand({ top: 100, right: 0, bottom: 0, left: 0 })).toMatchObject({ top: 100 });
	});

	it('U-28.4: with a pointer each of the map’s buttons takes the light fill on hover — the zoom’s half only while enabled — and a disabled «+» / «−» keeps the base rule’s `not-allowed` (no cursor of its own)', () => {
		render(Harness, {
			props: { zoomControls, expandControl: expandOf(false), hideControl: hideOf() }
		});
		for (const name of ['Χάρτης σε πλήρη οθόνη', 'Απόκρυψη χάρτη']) {
			const fill = screen
				.getByRole('button', { name })
				.querySelector('[data-slot="map-view-control-fill"]') as HTMLElement;
			expect(fill).toHaveClass(
				'can-hover:group-hover:bg-foreground/5',
				'transition-colors',
				'duration-standard',
				'ease-standard'
			);
		}
		for (const name of ['Μεγέθυνση', 'Σμίκρυνση']) {
			const button = screen.getByRole('button', { name });
			expect(button.firstElementChild).toHaveClass(
				'can-hover:group-enabled:group-hover:bg-foreground/5'
			);
			expect([...button.classList].filter((item) => item.includes('cursor-'))).toEqual([]);
		}
	});
});

describe('MapView: a pin fixed in the middle (wave 3, the doctor’s sign-up, record §6.7.4)', () => {
	beforeEach(() => {
		FakeMap.instances = [];
	});
	afterEach(() => vi.restoreAllMocks());

	const zoomControls = { zoomInLabel: 'Μεγέθυνση', zoomOutLabel: 'Σμίκρυνση' };
	const drag = new MouseEvent('mousemove');

	it('P-W3 §3.3.4: `zoomAround="center"` — the wheel and two fingers zoom around the centre, the double click (which zooms where it lands) is off', async () => {
		laidOut(320);
		render(Harness, { props: { zoomAround: 'center' } });
		expect((await created()).options).toMatchObject({
			scrollZoom: { around: 'center' },
			touchZoomRotate: { around: 'center' },
			doubleClickZoom: false
		});
	});

	it('P-W3 §3.3.4 (negative): by default MapLibre’s own zoom stays — around the pointer, the double click on; the profile’s wheel stays off', async () => {
		laidOut(320);
		const plain = render(Harness, {});
		expect((await created()).options).toMatchObject({
			scrollZoom: true,
			touchZoomRotate: true,
			doubleClickZoom: true
		});
		plain.unmount();
		FakeMap.instances = [];
		render(Harness, { props: { zoomAround: 'center', scrollZoom: false } });
		expect((await created()).options).toMatchObject({ scrollZoom: false, doubleClickZoom: false });
	});

	it('record §6.7.4: every move tells its centre; only the person’s own drag (or arrows) counts as a move by them — a fit, the kit’s «+» / «−» do not', async () => {
		laidOut(320);
		const onMoveStart = vi.fn();
		const onMoveEnd = vi.fn();
		render(Harness, { props: { onMoveStart, onMoveEnd } });
		const map = await created();

		map.emit('movestart', { originalEvent: drag });
		map.center = { lng: 23.7351, lat: 37.9812 };
		map.emit('moveend', { originalEvent: drag });
		expect(onMoveStart).toHaveBeenLastCalledWith({ byUser: true });
		expect(onMoveEnd).toHaveBeenLastCalledWith(
			{ latitude: 37.9812, longitude: 23.7351 },
			{ byUser: true }
		);

		// A move of the code (a fit, `zoomIn`): no event of the person.
		map.emit('movestart', {});
		map.center = { lng: 23.74, lat: 37.99 };
		map.emit('moveend', {});
		expect(onMoveStart).toHaveBeenLastCalledWith({ byUser: false });
		expect(onMoveEnd).toHaveBeenLastCalledWith(
			{ latitude: 37.99, longitude: 23.74 },
			{ byUser: false }
		);
	});

	it('record §6.7.4 (negative): the person’s zoom around the centre leaves the point where it was — no move by them', async () => {
		laidOut(320);
		const onMoveEnd = vi.fn();
		render(Harness, { props: { zoomAround: 'center', onMoveEnd } });
		const map = await created();
		const wheel = new WheelEvent('wheel');
		map.emit('movestart', { originalEvent: wheel });
		map.emit('moveend', { originalEvent: wheel });
		expect(onMoveEnd).toHaveBeenLastCalledWith(
			{ latitude: 37.98, longitude: 23.73 },
			{ byUser: false }
		);
	});

	it('record §6.7.4: `zoomControlsFrom="phone"` draws «+» / «−» at every width, where the caller puts them (bottom left); the default waits for 744', () => {
		const phone = render(Harness, {
			props: {
				zoomControls,
				zoomControlsFrom: 'phone',
				zoomControlsClass: 'top-auto right-auto bottom-2 left-3'
			}
		});
		const group = document.querySelector('[data-slot="map-view-zoom"]') as HTMLElement;
		expect(group).toHaveClass('flex', 'bottom-2', 'left-3', 'top-auto', 'right-auto');
		expect(group).not.toHaveClass('hidden', 'tablet:flex', 'top-2', 'right-3');
		expect(screen.getByRole('button', { name: 'Μεγέθυνση' })).toBeInTheDocument();
		phone.unmount();
		render(Harness, { props: { zoomControls } });
		expect(document.querySelector('[data-slot="map-view-zoom"]')).toHaveClass(
			'hidden',
			'tablet:flex'
		);
	});
});
