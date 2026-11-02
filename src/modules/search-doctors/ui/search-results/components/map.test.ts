import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { SearchResultCard } from '$modules/search-doctors/types';
import { MAP_STYLE_URLS } from '$shared/config/map';
import ResultsMap from './map.svelte';

type Handler = () => void;

const { FakeMap } = vi.hoisted(() => {
	class FakeMap {
		static instances: FakeMap[] = [];
		handlers = new Map<string, Handler[]>();
		setLayoutProperty = vi.fn();
		fitBounds = vi.fn();
		setStyle = vi.fn();
		remove = vi.fn();
		canvas = document.createElement('canvas');
		constructor(public options: Record<string, unknown>) {
			FakeMap.instances.push(this);
		}
		getCanvas() {
			return this.canvas;
		}
		isStyleLoaded() {
			return true;
		}
		// U-27.2: MapLibre's zoom (the page's map has its «+» / «−»).
		zoomIn = vi.fn();
		zoomOut = vi.fn();
		getZoom() {
			return 10;
		}
		getMinZoom() {
			return 0;
		}
		getMaxZoom() {
			return 22;
		}
		on(event: string, handler: Handler) {
			this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
			return this;
		}
		emit(event: string) {
			for (const handler of this.handlers.get(event) ?? []) handler();
		}
		getStyle() {
			return { layers: [] };
		}
		project([lng, lat]: [number, number]) {
			return { x: lng, y: lat };
		}
	}
	return { FakeMap };
});
vi.mock('maplibre-gl', () => ({ Map: FakeMap, setWorkerUrl: vi.fn() }));
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?url', () => ({ default: '/worker.mjs' }));

const card = (id: string, overrides: Partial<SearchResultCard> = {}): SearchResultCard => ({
	id,
	doctorSlug: `dr-${id}`,
	name: `Γιατρός ${id}`,
	specialty: 'Καρδιολόγος',
	area: 'Αμπελόκηποι',
	availabilityLabel: 'Σήμερα · 17:30',
	fee: { kind: 'amount', label: 'Από 60 €' },
	ratingLabel: '4,9',
	imageUrl: null,
	description: null,
	address: '',
	reviewCountLabel: '3',
	point: { latitude: 37.99, longitude: 23.76 },
	pinLabel: '60 €',
	...overrides
});

const items = [
	card('a'),
	card('b', { fee: { kind: 'login', label: 'Συνδεθείτε για κόστος' }, pinLabel: null }),
	card('c', { point: null })
];

const props = {
	items,
	hotId: null,
	locale: 'el' as const,
	profileHref: (slug: string) => `/doctors/${slug}`,
	profileLabel: 'Προφίλ γιατρού',
	mapLabel: 'Χάρτης με τους γιατρούς της λίστας',
	closeLabel: 'Κλείσιμο',
	onSignIn: () => {}
};

async function loadedMap() {
	await waitFor(() => expect(FakeMap.instances).toHaveLength(1));
	const map = FakeMap.instances[0];
	map.emit('load');
	await waitFor(() =>
		expect(screen.getAllByRole('button', { pressed: false }).length).toBeGreaterThan(0)
	);
	return map;
}

describe('search-doctors::ui::search-results::results-map', () => {
	beforeEach(() => {
		FakeMap.instances = [];
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
	});
	afterEach(() => vi.restoreAllMocks());

	it('U-24.4: the ONE map config’s style in the reader’s theme (positron in the light theme)', async () => {
		render(ResultsMap, { props });
		await waitFor(() => expect(FakeMap.instances).toHaveLength(1));
		expect(FakeMap.instances[0].options.style).toBe(MAP_STYLE_URLS.light);
	});

	it('U-24.4: a pin per card with coordinates — the price pill, or the dot when the fee needs sign-in; no coordinates, no pin', async () => {
		render(ResultsMap, { props });
		await loadedMap();
		const priced = screen.getByTestId('results-pin-a');
		expect(priced).toHaveAttribute('data-kind', 'price');
		expect(priced).toHaveAccessibleName('Γιατρός a, 60 €');
		const dot = screen.getByTestId('results-pin-b');
		expect(dot).toHaveAttribute('data-kind', 'dot');
		expect(dot).toHaveAccessibleName('Γιατρός b, Συνδεθείτε για κόστος');
		expect(screen.queryByTestId('results-pin-c')).toBeNull();
	});

	it('U-24.4: a pressed pin turns dark and opens the doctor’s card over the map; its «×» and a press on the map close it', async () => {
		const onSelect = vi.fn();
		render(ResultsMap, { props: { ...props, onSelect } });
		const map = await loadedMap();
		await userEvent.setup({ delay: null }).click(screen.getByTestId('results-pin-a'));
		expect(onSelect).toHaveBeenCalledWith('a');
		expect(screen.getByTestId('results-pin-a')).toHaveAttribute('data-state', 'selected');
		const pinCard = screen.getByTestId('results-pin-card');
		expect(within(pinCard).getByRole('link', { name: 'Προφίλ γιατρού Γιατρός a' })).toHaveAttribute(
			'href',
			'/doctors/dr-a'
		);
		expect(pinCard).toHaveTextContent('Καρδιολόγος · Αμπελόκηποι');
		expect(pinCard).toHaveTextContent('Σήμερα · 17:30');
		expect(pinCard.textContent).toMatch(/Από 60\s€ ·\s+★\s4,9/);
		expect(pinCard).toHaveClass(
			'bottom-map-card-over-sheet',
			'tablet:bottom-map-card-over-switch',
			'tablet:w-narrow',
			'laptop:bottom-5'
		);
		await userEvent
			.setup({ delay: null })
			.click(within(pinCard).getByRole('button', { name: 'Κλείσιμο' }));
		expect(screen.queryByTestId('results-pin-card')).toBeNull();

		await userEvent.setup({ delay: null }).click(screen.getByTestId('results-pin-b'));
		expect(screen.getByTestId('results-pin-card')).toBeInTheDocument();
		map.emit('click');
		await waitFor(() => expect(screen.queryByTestId('results-pin-card')).toBeNull());
	});

	it('U-24.4: the list card under the pointer grows its pin (hot)', async () => {
		render(ResultsMap, { props: { ...props, hotId: 'a' } });
		await loadedMap();
		expect(screen.getByTestId('results-pin-a')).toHaveAttribute('data-state', 'hot');
		expect(screen.getByTestId('results-pin-b')).toHaveAttribute('data-state', 'idle');
	});

	it('U-24.4 (D-103, negative): the map asks nothing of its own — its pins are the list’s cards, fitted to them', async () => {
		render(ResultsMap, { props });
		const map = await loadedMap();
		expect(map.fitBounds).toHaveBeenCalledTimes(1);
		expect(map.fitBounds.mock.calls[0][0]).toEqual([
			[23.76, 37.99],
			[23.76, 37.99]
		]);
	});

	it('U-24.4 / (ε) (MINOR-8 α of r1): Enter on a pin opens its card; Escape closes it and the focus stays on that pin', async () => {
		const user = userEvent.setup({ delay: null });
		render(ResultsMap, { props });
		await loadedMap();
		const pin = screen.getByTestId('results-pin-a');
		pin.focus();
		await user.keyboard('{Enter}');
		expect(screen.getByTestId('results-pin-card')).toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(screen.queryByTestId('results-pin-card')).toBeNull();
		expect(document.activeElement).toBe(screen.getByTestId('results-pin-a'));
		// (negative) never the page's body
		expect(document.activeElement).not.toBe(document.body);
	});

	it('U-24.4 / (ε) (MINOR-8 α of r1): the card’s «×», and Escape from inside the card, give the focus back to its pin', async () => {
		const user = userEvent.setup({ delay: null });
		render(ResultsMap, { props });
		await loadedMap();
		await user.click(screen.getByTestId('results-pin-b'));
		await user.click(
			within(screen.getByTestId('results-pin-card')).getByRole('button', { name: 'Κλείσιμο' })
		);
		expect(screen.queryByTestId('results-pin-card')).toBeNull();
		await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('results-pin-b')));
		expect(document.activeElement).not.toBe(document.body);

		await user.click(screen.getByTestId('results-pin-a'));
		within(screen.getByTestId('results-pin-card')).getByRole('link').focus();
		await user.keyboard('{Escape}');
		expect(screen.queryByTestId('results-pin-card')).toBeNull();
		await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('results-pin-a')));
	});

	it('U-24.4 (negative, MINOR-8 α of r1): Escape with no card open moves nothing', async () => {
		const user = userEvent.setup({ delay: null });
		render(ResultsMap, { props });
		await loadedMap();
		screen.getByTestId('results-pin-b').focus();
		await user.keyboard('{Escape}');
		expect(document.activeElement).toBe(screen.getByTestId('results-pin-b'));
		expect(screen.queryByTestId('results-pin-card')).toBeNull();
	});

	it('NIT-4 (r1): the fee gives way on a narrow card, the rating («★ Νέο») is never cut', async () => {
		render(ResultsMap, { props: { ...props, items: [card('a', { ratingLabel: 'Νέο' })] } });
		await loadedMap();
		await userEvent.setup({ delay: null }).click(screen.getByTestId('results-pin-a'));
		const row = within(screen.getByTestId('results-pin-card')).getByText(/Από 60/).parentElement;
		expect(row).toHaveAttribute('data-slot', 'results-pin-card-fee');
		expect(row).toHaveClass('flex', 'min-w-0');
		expect(row).not.toHaveClass('line-clamp-1');
		const [fee, rating] = Array.from(row?.children ?? []);
		expect(fee).toHaveClass('min-w-0', 'truncate');
		expect(rating).toHaveClass('shrink-0', 'whitespace-nowrap');
		expect(rating.textContent).toMatch(/★\sΝέο/);
	});

	it('NIT-8 (r1): the camera fits a search’s pins once, with the page’s room; a next page of it leaves the camera alone', async () => {
		const fitPadding = vi.fn(() => ({ top: 32, right: 32, bottom: 232, left: 32 }));
		const view = render(ResultsMap, {
			props: { ...props, items: [card('a')], fitKey: 'search-1', fitPadding }
		});
		const map = await loadedMap();
		expect(map.fitBounds).toHaveBeenCalledTimes(1);
		expect(map.fitBounds.mock.calls[0][1]).toMatchObject({
			padding: { top: 32, right: 32, bottom: 232, left: 32 }
		});
		await view.rerender({
			...props,
			items: [card('a'), card('d', { point: { latitude: 38.05, longitude: 23.8 } })],
			fitKey: 'search-1',
			fitPadding
		});
		await waitFor(() => expect(screen.getByTestId('results-pin-d')).toBeInTheDocument());
		expect(map.fitBounds).toHaveBeenCalledTimes(1);
	});
});

describe('search-doctors::ui::search-results::results-map (f1)', () => {
	beforeEach(() => {
		FakeMap.instances = [];
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
	});
	afterEach(() => vi.restoreAllMocks());

	it('U-27.3 (app = web): the pin’s card writes the specialty and the area in the text colour, not muted', async () => {
		render(ResultsMap, { props });
		await loadedMap();
		await userEvent.setup({ delay: null }).click(screen.getByTestId('results-pin-a'));
		const facts = within(screen.getByTestId('results-pin-card')).getByText(
			'Καρδιολόγος · Αμπελόκηποι'
		);
		expect(facts).toHaveClass('text-foreground');
		expect(facts).not.toHaveClass('text-muted-foreground');
	});

	// Rewritten by f1b (U-27.4 «no change of layout»): f1's action was a 48 box beside the cut words.
	it('U-27.4 (app = web, f1b): a hidden fee on the pin’s card is the action, inline in the same cut words as before (lock, underlined, 600, the text colour), outside the card’s link — and opens the sign-in, never the profile', async () => {
		const user = userEvent.setup({ delay: null });
		const onSignIn = vi.fn();
		render(ResultsMap, { props: { ...props, onSignIn } });
		await loadedMap();
		await user.click(screen.getByTestId('results-pin-b'));
		const pinCard = screen.getByTestId('results-pin-card');
		const link = within(pinCard).getByRole('link', { name: 'Προφίλ γιατρού Γιατρός b' });
		const followed = vi.fn((event: Event) => event.preventDefault());
		link.addEventListener('click', followed);
		const action = within(pinCard).getByRole('button', { name: 'Συνδεθείτε για κόστος' });
		expect(action).toHaveAttribute('data-testid', 'results-pin-card-sign-in');
		expect(action.closest('a')).toBeNull();
		expect(link).not.toContainElement(action);
		expect(action).toHaveClass('font-semibold', 'text-foreground', 'underline', 'after:-inset-1');
		expect(action).not.toHaveClass('min-h-touch');
		expect(action.querySelector('[data-icon="lock-closed-outline"]')).toHaveClass('icon-xs');
		// The words that give way as before (NIT-4), with 4 of room given back; the rating stays beside them.
		const words = action.parentElement as HTMLElement;
		expect(words).toHaveClass('min-w-0', 'truncate', '-m-1', 'p-1');
		expect(words.parentElement).toHaveAttribute('data-slot', 'results-pin-card-fee');
		expect(words.parentElement).toHaveClass('items-baseline');
		expect(words.textContent).toBe('Συνδεθείτε για κόστος ·');
		expect(action.closest('[data-slot="results-pin-card-fee"]')?.textContent).toMatch(/·\s*★\s4,9/);
		await user.click(action);
		expect(onSignIn).toHaveBeenCalledOnce();
		// (negative) the press opens nothing of the card: no profile, and the card stays.
		expect(followed).not.toHaveBeenCalled();
		expect(screen.getByTestId('results-pin-card')).toBeInTheDocument();
		// (negative) the link's name never carries the fee.
		expect(link.getAttribute('aria-label')).not.toContain('Συνδεθείτε');
	});

	it('U-27.4 (negative): with a price («Από 60 €») the pin’s card is as before — words, no button', async () => {
		render(ResultsMap, { props });
		await loadedMap();
		await userEvent.setup({ delay: null }).click(screen.getByTestId('results-pin-a'));
		const pinCard = screen.getByTestId('results-pin-card');
		expect(within(pinCard).queryByTestId('results-pin-card-sign-in')).toBeNull();
		expect(
			within(pinCard)
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label'))
		).toEqual(['Κλείσιμο']);
		expect(within(pinCard).getByText(/Από 60/)).toHaveClass('min-w-0', 'truncate');
		// f1b: the words are the ones before f1, class for class.
		expect([...within(pinCard).getByText(/Από 60/).classList]).toEqual(['min-w-0', 'truncate']);
	});

	it('U-27.2: the results’ map passes its «+» / «−» names on to the map', async () => {
		render(ResultsMap, {
			props: { ...props, zoomControls: { zoomInLabel: 'Μεγέθυνση', zoomOutLabel: 'Σμίκρυνση' } }
		});
		const map = await loadedMap();
		await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Μεγέθυνση' }));
		expect(map.zoomIn).toHaveBeenCalledWith({ essential: true });
	});

	it('U-28.2: the results’ map passes its «⤢» / «×» and «Απόκρυψη χάρτη» on to the map, each calling the page back', async () => {
		const onExpandedChange = vi.fn();
		const onHide = vi.fn();
		render(ResultsMap, {
			props: {
				...props,
				expandControl: {
					expanded: false,
					expandLabel: 'Χάρτης σε πλήρη οθόνη',
					collapseLabel: 'Κλείσιμο χάρτη πλήρους οθόνης',
					onExpandedChange
				},
				hideControl: { label: 'Απόκρυψη χάρτη', onHide }
			}
		});
		const map = screen.getByTestId('results-map');
		await userEvent
			.setup({ delay: null })
			.click(within(map).getByRole('button', { name: 'Χάρτης σε πλήρη οθόνη' }));
		expect(onExpandedChange).toHaveBeenCalledWith(true);
		await userEvent
			.setup({ delay: null })
			.click(within(map).getByRole('button', { name: 'Απόκρυψη χάρτη' }));
		expect(onHide).toHaveBeenCalledOnce();
	});

	it('U-28.1: from 1128 the pin’s card is at most 360 and keeps 12 from the 1/3 map’s sides (~347 wide at 1128), centred by its margins; below it as before', async () => {
		render(ResultsMap, { props });
		await loadedMap();
		await userEvent.setup({ delay: null }).click(screen.getByTestId('results-pin-a'));
		const pinCard = screen.getByTestId('results-pin-card');
		expect(pinCard).toHaveClass(
			'laptop:inset-x-3',
			'laptop:mx-auto',
			'laptop:w-auto',
			'laptop:max-w-narrow',
			'laptop:translate-x-0',
			'laptop:bottom-5'
		);
		// (negative) 744–1127 and the phone keep their places.
		expect(pinCard).toHaveClass(
			'inset-x-3',
			'bottom-map-card-over-sheet',
			'tablet:inset-x-auto',
			'tablet:left-1/2',
			'tablet:w-narrow',
			'tablet:-translate-x-1/2'
		);
	});
});
