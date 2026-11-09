import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusManager, onlineManager, type QueryClient } from '@tanstack/svelte-query';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { Session, SessionStatus } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import type { DoctorOnboardingProgress } from '$modules/doctor-onboarding/api/progress';
import type { DoctorOnboardingScreen } from '$modules/doctor-onboarding/lib/steps';
import { doctorOnboardingProgressSample } from '$modules/doctor-onboarding/lib/onboarding.sample';
import type { OnboardingDraft } from '$modules/doctor-onboarding/ui/draft-host';
import Harness from './onboarding.harness.svelte';
import type { DoctorOnboardingContext } from '../types';

type Handler = (event?: unknown) => void;

const { FakeMap } = vi.hoisted(() => {
	class FakeMap {
		static instances: FakeMap[] = [];
		handlers = new Map<string, Handler[]>();
		setLayoutProperty = vi.fn();
		fitBounds = vi.fn();
		setStyle = vi.fn();
		remove = vi.fn();
		zoomIn = vi.fn();
		zoomOut = vi.fn();
		canvas = document.createElement('canvas');
		center = { lng: 0, lat: 0 };
		constructor(public options: Record<string, unknown>) {
			const [lng, lat] = options.center as [number, number];
			this.center = { lng, lat };
			FakeMap.instances.push(this);
		}
		getCanvas() {
			return this.canvas;
		}
		isStyleLoaded() {
			return true;
		}
		getZoom() {
			return 17;
		}
		getMinZoom() {
			return 0;
		}
		getMaxZoom() {
			return 22;
		}
		getCenter() {
			return this.center;
		}
		on(event: string, handler: Handler) {
			this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
			return this;
		}
		emit(event: string, payload?: unknown) {
			for (const handler of this.handlers.get(event) ?? []) handler(payload);
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

// The device's position (D-W3-12): a stand-in, never the browser's.
const { resolveDeviceLocation } = vi.hoisted(() => ({ resolveDeviceLocation: vi.fn() }));
vi.mock('$shared/lib/location', async (importOriginal) => ({
	...(await importOriginal<typeof import('$shared/lib/location')>()),
	resolveDeviceLocation
}));

type Call = { path: string; method: string; body?: unknown; url: string; credentials?: string };
type Handle = {
	session: Session;
	client: QueryClient;
	draft: OnboardingDraft;
	setStatus: (status: SessionStatus) => void;
};
let calls: Call[];
let server: DoctorOnboardingProgress;
let answers: Record<string, (body: unknown) => Response>;

const TOKEN = '3b241101-e2bb-4255-8caf-4136c566a962';
const PROOF = `v1.${'a'.repeat(30)}.${'0'.repeat(64)}`;
const place = (index: number) => ({
	placeId: `ChIJplace${index}xyz`,
	mainText: `Καραΐσκου ${index}`,
	secondaryText: 'Πειραιάς, Ελλάδα'
});
/** The edits a chosen suggestion leaves (37 confirm): Google's address, its point, its place, its proof. */
const chosen = {
	streetLine: 'Καραΐσκου 74',
	postalCode: '185 32',
	city: 'Πειραιάς',
	latitude: 37.94,
	longitude: 23.64,
	placeId: 'ChIJplace1xyz',
	pointProof: PROOF,
	pinMoved: false,
	source: 'google' as const
};

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const refusal = (status: number, errorMessage: string, errorCode = 'EC000') =>
	new Response(JSON.stringify({ errorCode, errorMessage }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

const context: DoctorOnboardingContext = {
	locale: 'el',
	href: (path) => path,
	helpHref: '/help',
	homeHref: '/',
	readCodeFailure: () => 'unknown',
	// The sign-in's rule for a number, made simple (W8-Σ1): a page of these specs sends no office phone.
	toPhoneNumber: (typed) => typed.trim() || null,
	showPhoneNumber: (stored) => stored
};

beforeEach(() => {
	calls = [];
	answers = {};
	FakeMap.instances = [];
	server = doctorOnboardingProgressSample({ missing: ['OFFICE_ADDRESS', 'OFFICE_PHONE'] });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const path = new URL(url).pathname.replace(/^\/api\/v\d+/u, '');
			const body = init.body ? JSON.parse(String(init.body)) : undefined;
			calls.push({ path, method, body, url, credentials: init.credentials });
			const answer = answers[`${method} ${path}`];
			if (answer) return answer(body);
			if (path.startsWith('/doctor/onboarding')) return json(server);
			return json({});
		})
	);
	// The map is made once its box is laid out (U-24.4).
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(360);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
	page.state = {};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function draw(
	first: DoctorOnboardingScreen,
	{ depth = 0, prepare }: { depth?: number; prepare?: (handle: Handle) => void } = {}
) {
	const handle = {} as Handle;
	const back = vi.spyOn(history, 'back').mockImplementation(() => {});
	const toasts = new ToastState();
	const propsOf = (screenName: DoctorOnboardingScreen) => ({
		component: Harness as unknown as Component<never>,
		props: {
			start: 'member',
			screen: screenName,
			context,
			toasts,
			onReady: (ready: Handle) => {
				Object.assign(handle, ready);
				prepare?.(handle);
			}
		}
	});
	page.state = depth ? { onboarding: { depth } } : {};
	const view = render(QueryHarness, { props: propsOf(first) });
	/** The navigation `goto` was asked for: the next page, in the same tab (the root's host stays). */
	const open = async (next: DoctorOnboardingScreen, nextDepth = 0) => {
		page.state = nextDepth ? { onboarding: { depth: nextDepth } } : {};
		// QueryHarness has a prop named `props`: the options' form (as `messages/ui/inbox/page/index.test.ts` does).
		await view.rerender({ props: propsOf(next) } as never);
	};
	return { view, handle, back, open };
}

const user = () => userEvent.setup({ delay: null });
const next = () => screen.getByTestId('doctor-onboarding-next');
/** The step's content is drawn: its frame is there and the server's progress has come. */
const ready = async () => {
	await screen.findByTestId('doctor-onboarding-next');
	await waitFor(() => expect(screen.queryByTestId('doctor-onboarding-loading')).toBeNull());
};
const writes = () => calls.filter((call) => call.method !== 'GET');
const searches = () => calls.filter((call) => call.path === '/location/address-search/suggestions');
const opened = (path: string, depth: number, replaceState = false) =>
	expect(vi.mocked(goto)).toHaveBeenCalledWith(path, {
		replaceState,
		state: { onboarding: { depth } }
	});
/**
 * U-100 / D-W3-27: nothing of the sign-up's frame and rows takes a colour under the pointer. The site's round controls
 * (the map's «+» / «−», a field's «×») keep their own light fill (U-28.4), as the moved picker keeps its own (D-W3-30).
 */
const noHover = (root: Element) => {
	for (const node of [root, ...root.querySelectorAll('*')]) {
		if (node.closest('[data-slot="map-view"], [data-slot="icon-button"]')) continue;
		expect([...node.classList].filter((name) => name.includes('hover:'))).toEqual([]);
	}
};
const made = async () => {
	await waitFor(() => expect(FakeMap.instances).toHaveLength(1));
	return FakeMap.instances[0];
};
const drag = () => ({ originalEvent: new MouseEvent('mousedown') });
/** Whether the still map is out of reach (`inert`: the browser reflects it as the attribute, jsdom as the property). */
const inert = (node: Element | null) =>
	Boolean(node?.hasAttribute('inert') || (node as (Element & { inert?: boolean }) | null)?.inert);

describe('37 · «Πού βρίσκεται το ιατρείο σας;» (record §6.7.1)', () => {
	it('a still map of Athens at a city’s zoom, out of reach; the white capsule opens the address search as a page of its own (U-102); «Επόμενο» locked without an address', async () => {
		draw('location');
		await ready();
		const map = await made();
		expect(map.options).toMatchObject({ center: [23.7348, 37.9755], zoom: 10.5 });
		const box = screen.getByTestId('doctor-onboarding-location-map');
		expect(inert(box.firstElementChild)).toBe(true);
		expect(box.querySelector('[data-slot="doctor-onboarding-pin"]')).toBeNull();
		const pill = screen.getByTestId('doctor-onboarding-location-pill');
		expect(pill).toHaveAttribute('href', '/doctor/onboarding/location/search');
		expect(pill).toHaveTextContent('Εισαγάγετε τη διεύθυνση');
		expect(next()).toBeDisabled();
		noHover(screen.getByTestId('doctor-onboarding-location'));
		await user().click(pill);
		opened('/doctor/onboarding/location/search', 1);
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('record §6.6: with an address, the map at street level under the pin and the doctor’s OWN address in the capsule; «Επόμενο» writes nothing and opens the confirmation', async () => {
		draw('location', { prepare: (ready) => ready.draft.update('office', chosen) });
		await ready();
		const map = await made();
		expect(map.options).toMatchObject({ center: [23.64, 37.94], zoom: 15 });
		expect(document.querySelector('[data-slot="doctor-onboarding-pin"]')).not.toBeNull();
		expect(screen.getByTestId('doctor-onboarding-location-pill')).toHaveAccessibleName(
			'Αλλαγή διεύθυνσης: Καραΐσκου 74, 185 32 Πειραιάς'
		);
		expect(screen.queryByText(/Google/u)).toBeNull();
		await user().click(next());
		opened('/doctor/onboarding/location/confirm', 1);
		expect(writes()).toEqual([]);
	});
});

describe('37 · «Εισαγάγετε τη διεύθυνση του ιατρείου» (record §6.7.2, D-W3-02, U-109.2)', () => {
	it('🔴 U-102: a page of its own — «←», the title, the field; below two letters «Χρήση τρέχουσας τοποθεσίας» and nothing asked', async () => {
		draw('address-search', { depth: 1 });
		const input = await screen.findByTestId('doctor-onboarding-address-field');
		expect(
			screen.getByRole('heading', { level: 1, name: 'Εισαγάγετε τη διεύθυνση του ιατρείου' })
		).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByTestId('doctor-onboarding-sub-back')).toHaveAttribute(
			'href',
			'/doctor/onboarding/location'
		);
		expect(input).toHaveAttribute('maxlength', '120');
		await user().type(input, 'Κ');
		await new Promise((resolve) => setTimeout(resolve, 350));
		expect(screen.getByTestId('doctor-onboarding-address-here')).toHaveTextContent(
			'Χρήση τρέχουσας τοποθεσίας'
		);
		expect(searches()).toEqual([]);
		noHover(screen.getByTestId('doctor-onboarding-address-search'));
	});

	it('🔴 D-W3-02: from two letters, once the keys stop, ONE request without a token; the next of this search carries the server’s; up to five suggestions as text, then the manual row and «Google Maps»', async () => {
		answers['POST /location/address-search/suggestions'] = () =>
			json({
				sessionToken: TOKEN,
				suggestions: [
					{ placeId: 'ChIJevilevil', mainText: '<img src=x onerror=alert(1)>', secondaryText: '' },
					...[1, 2, 3, 4, 5, 6].map(place)
				]
			});
		draw('address-search', { depth: 1 });
		const input = await screen.findByTestId('doctor-onboarding-address-field');
		await user().type(input, 'Καρα');
		const list = await screen.findByTestId('doctor-onboarding-address-suggestions');
		expect(searches().map((call) => call.body)).toEqual([{ input: 'Καρα' }]);
		expect(within(list).getAllByRole('button')).toHaveLength(5);
		expect(within(list).getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
		expect(screen.getByText('Προτεινόμενα')).toBeInTheDocument();
		expect(screen.getByTestId('doctor-onboarding-address-manual')).toHaveTextContent(
			'Μη αυτόματη εισαγωγή διεύθυνσης'
		);
		// Review w3-w4 R1 NIT-3: no name on a paragraph — a reader hears the line, the eye sees «Google Maps».
		const attribution = screen.getByTestId('doctor-onboarding-address-attribution');
		expect(attribution).not.toHaveAttribute('aria-label');
		expect(within(attribution).getByText('Προτάσεις από Google Maps')).toHaveClass('sr-only');
		expect(within(attribution).getByText('Google Maps')).toHaveAttribute('aria-hidden', 'true');
		expect(screen.queryByTestId('doctor-onboarding-address-here')).toBeNull();

		await user().type(input, 'ΐσκου');
		await waitFor(() => expect(searches()).toHaveLength(2));
		expect(searches()[1].body).toEqual({ input: 'Καραΐσκου', sessionToken: TOKEN });
		expect(searches().every((call) => call.credentials === 'include')).toBe(true);
	});

	it('🔴 D-W3-33 / D-W3-02: a suggestion chosen asks its details with the token (the session’s last request), keeps the proof in the draft only, and «Επιβεβαιώστε» takes this page’s place; the next search starts a new session', async () => {
		answers['POST /location/address-search/suggestions'] = () =>
			json({ sessionToken: TOKEN, suggestions: [place(1), place(2)] });
		answers['POST /location/address-search/details'] = () =>
			json({
				placeId: 'ChIJplace1xyz',
				streetLine: 'Καραΐσκου 74',
				postalCode: '18532',
				city: 'Πειραιάς',
				latitude: 37.94,
				longitude: 23.64,
				pointProof: PROOF
			});
		const { handle } = draw('address-search', { depth: 1 });
		const input = await screen.findByTestId('doctor-onboarding-address-field');
		await user().type(input, 'Καρα');
		await user().click(await screen.findByTestId('doctor-onboarding-address-ChIJplace1xyz'));
		await waitFor(() => opened('/doctor/onboarding/location/confirm', 1, true));
		expect(calls.find((call) => call.path === '/location/address-search/details')?.body).toEqual({
			placeId: 'ChIJplace1xyz',
			sessionToken: TOKEN
		});
		expect(handle.draft.edits.office).toEqual(chosen);
		expect(localStorage.length + sessionStorage.length).toBe(0);
		expect(vi.mocked(goto).mock.calls.every(([href]) => !String(href).includes(PROOF))).toBe(true);

		await user().type(input, ' 74');
		await waitFor(() => expect(searches()).toHaveLength(2));
		expect(searches()[1].body).toEqual({ input: 'Καρα 74' });
	});

	it('🔴 review w3-w4 R1 MINOR-2 (D-W3-35, D-W3-02): a return to the tab or a new connection asks nothing again; an answer that lands after the pick never brings the spent token back — the next search starts a new session', async () => {
		let release: (() => void) | null = null;
		answers['POST /location/address-search/suggestions'] = () =>
			json({ sessionToken: TOKEN, suggestions: [place(1)] });
		answers['POST /location/address-search/details'] = () =>
			json({
				placeId: 'ChIJplace1xyz',
				streetLine: 'Καραΐσκου 1',
				postalCode: '18532',
				city: 'Πειραιάς',
				latitude: 37.94,
				longitude: 23.64,
				pointProof: PROOF
			});
		const { handle } = draw('address-search', { depth: 1 });
		const input = await screen.findByTestId('doctor-onboarding-address-field');
		await user().type(input, 'Καρα');
		await screen.findByTestId('doctor-onboarding-address-ChIJplace1xyz');
		expect(searches()).toHaveLength(1);
		try {
			focusManager.setFocused(false);
			focusManager.setFocused(true);
			onlineManager.setOnline(false);
			onlineManager.setOnline(true);
			await new Promise((resolve) => setTimeout(resolve, 30));
			expect(searches()).toHaveLength(1);
		} finally {
			focusManager.setFocused(undefined);
			onlineManager.setOnline(true);
		}

		// A request of the same search still on its way when the suggestion is chosen…
		answers['POST /location/address-search/suggestions'] = () =>
			new Promise<Response>((resolve) => {
				release = () => resolve(json({ sessionToken: TOKEN, suggestions: [place(1)] }));
			}) as unknown as Response;
		void handle.client.refetchQueries({ queryKey: ['doctor-onboarding', 'address-search'] });
		await waitFor(() => expect(searches()).toHaveLength(2));
		await user().click(screen.getByTestId('doctor-onboarding-address-ChIJplace1xyz'));
		await waitFor(() => opened('/doctor/onboarding/location/confirm', 1, true));
		// …lands after it: the token it brings was spent by the details.
		(release as (() => void) | null)?.();
		await new Promise((resolve) => setTimeout(resolve, 20));
		answers['POST /location/address-search/suggestions'] = () =>
			json({ sessionToken: TOKEN, suggestions: [] });
		await user().clear(input);
		await user().type(input, 'Ερμού 10');
		await waitFor(() => expect(searches()).toHaveLength(3));
		expect(searches()[2].body).toEqual({ input: 'Ερμού 10' });
	});

	it('(negative) none found, the service down, a place outside Greece — each says so, and the manual row stays; the manual row opens the confirmation empty', async () => {
		answers['POST /location/address-search/suggestions'] = (body) => {
			const { input } = body as { input: string };
			if (input === 'ωωω') return json({ sessionToken: TOKEN, suggestions: [] });
			if (input === 'ωωωω') return refusal(503, 'ADDRESS_SEARCH_UNAVAILABLE');
			return json({ sessionToken: TOKEN, suggestions: [place(1)] });
		};
		answers['POST /location/address-search/details'] = () => refusal(422, 'ADDRESS_OUTSIDE_GREECE');
		const { handle } = draw('address-search', { depth: 1 });
		const input = await screen.findByTestId('doctor-onboarding-address-field');
		await user().type(input, 'ωωω');
		expect(await screen.findByTestId('doctor-onboarding-address-empty')).toHaveTextContent(
			'Δεν βρέθηκε η διεύθυνση. Δοκιμάστε με την πόλη, ή συμπληρώστε τη μόνοι σας.'
		);
		expect(screen.getByTestId('doctor-onboarding-address-manual')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-onboarding-address-attribution')).toBeNull();

		await user().type(input, 'ω');
		await waitFor(() =>
			expect(screen.getByTestId('doctor-onboarding-address-empty')).toHaveTextContent(
				'Η αναζήτηση δεν είναι διαθέσιμη αυτή τη στιγμή.'
			)
		);

		await user().clear(input);
		await user().type(input, 'Καρα');
		await user().click(await screen.findByTestId('doctor-onboarding-address-ChIJplace1xyz'));
		expect(await screen.findByTestId('doctor-onboarding-address-notice')).toHaveTextContent(
			'Δεν βρέθηκε η διεύθυνση.'
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();

		await user().click(screen.getByTestId('doctor-onboarding-address-manual'));
		opened('/doctor/onboarding/location/confirm', 1, true);
		expect(handle.draft.edits.office).toMatchObject({
			streetLine: '',
			latitude: null,
			placeId: null,
			pointProof: null,
			source: 'manual'
		});
	});

	it('🔴 D-W3-35 (W-4, w3-b3 codes): past a daily limit — the account’s or the whole API’s — a `429` says «Η αναζήτηση δεν είναι διαθέσιμη…», never retried; the manual row always stays', async () => {
		answers['POST /location/address-search/suggestions'] = (body) => {
			const { input } = body as { input: string };
			if (input === 'Καρα') return json({ sessionToken: TOKEN, suggestions: [place(1)] });
			return refusal(429, 'Too many requests (address-search-suggestions-project)', 'EC429');
		};
		answers['POST /location/address-search/details'] = () =>
			refusal(429, 'Too many requests (address-search-details-daily)', 'EC429');
		draw('address-search', { depth: 1 });
		const input = await screen.findByTestId('doctor-onboarding-address-field');
		await user().type(input, 'Πειρ');
		expect(await screen.findByTestId('doctor-onboarding-address-empty')).toHaveTextContent(
			'Η αναζήτηση δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκιμάστε ξανά ή συμπληρώστε τη διεύθυνση μόνοι σας.'
		);
		expect(screen.getByTestId('doctor-onboarding-address-manual')).toBeInTheDocument();
		expect(calls.filter((call) => call.path.endsWith('/suggestions'))).toHaveLength(1);

		await user().clear(input);
		await user().type(input, 'Καρα');
		await user().click(await screen.findByTestId('doctor-onboarding-address-ChIJplace1xyz'));
		expect(await screen.findByTestId('doctor-onboarding-address-notice')).toHaveTextContent(
			'Η αναζήτηση δεν είναι διαθέσιμη αυτή τη στιγμή.'
		);
		expect(calls.filter((call) => call.path.endsWith('/details'))).toHaveLength(1);
		expect(screen.getByTestId('doctor-onboarding-address-manual')).toBeInTheDocument();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 D-W3-12: «Χρήση τρέχουσας τοποθεσίας» takes the browser’s point for the pin alone — no Google, no lookup; the street is typed next. Refused, it says so', async () => {
		resolveDeviceLocation.mockResolvedValueOnce({
			status: 'granted',
			coords: { latitude: 37.95, longitude: 23.7 }
		});
		const { handle } = draw('address-search', { depth: 1 });
		await user().click(await screen.findByTestId('doctor-onboarding-address-here'));
		await waitFor(() => opened('/doctor/onboarding/location/confirm', 1, true));
		expect(resolveDeviceLocation).toHaveBeenCalledWith({ highAccuracy: true });
		expect(handle.draft.edits.office).toMatchObject({
			streetLine: '',
			latitude: 37.95,
			longitude: 23.7,
			placeId: null,
			source: 'device'
		});
		expect(calls.filter((call) => call.path !== '/doctor/onboarding')).toEqual([]);

		vi.mocked(goto).mockClear();
		resolveDeviceLocation.mockResolvedValueOnce({ status: 'denied', canAskAgain: false });
		await user().click(screen.getByTestId('doctor-onboarding-address-here'));
		expect(await screen.findByTestId('doctor-onboarding-address-notice')).toHaveTextContent(
			'Δεν δώσατε πρόσβαση στην τοποθεσία.'
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});
});

describe('37 · «Επιβεβαιώστε τη διεύθυνση» (record §6.7.3, D-W3-04)', () => {
	it('W8-Δ5: the four fields are ONE joined group — no gap between them (each edge on the next one’s), the corners only at its two ends; the field in focus or in error comes over its neighbours', async () => {
		draw('address-confirm', { depth: 1, prepare: (ready) => ready.draft.update('office', chosen) });
		await ready();
		const group = screen.getByTestId('doctor-onboarding-address-fields');
		const inputs = [
			screen.getByLabelText('Χώρα'),
			screen.getByLabelText('Οδός και αριθμός'),
			screen.getByLabelText('Ταχυδρομικός κώδικας'),
			screen.getByLabelText('Πόλη ή περιοχή')
		];
		const fields = inputs.map((input) => input.closest('[data-slot="text-field"]') as HTMLElement);
		expect([...group.children].slice(0, 4)).toEqual(fields);
		expect(group.className).not.toMatch(/(^|\s)gap-/u);
		for (const field of fields.slice(0, 3)) {
			expect(field).toHaveClass('pb-0', 'focus-within:z-20');
			expect(field).not.toHaveClass('pb-1');
		}
		// W8 Delta 2 (NIT-4): the field in focus (20) over a postal code in error (10), never a tie the DOM's order breaks.
		expect(fields[3]).toHaveClass('focus-within:z-20');
		for (const input of inputs.slice(1)) expect(input).toHaveClass('-mt-px');
		expect(inputs[0]).toHaveClass('rounded-b-none');
		expect(inputs[1]).toHaveClass('rounded-none');
		expect(inputs[2]).toHaveClass('rounded-none');
		expect(inputs[3]).toHaveClass('rounded-t-none');
		await user().clear(inputs[2]);
		await user().type(inputs[2], '185');
		await user().tab();
		await waitFor(() => expect(inputs[2]).toHaveAttribute('aria-invalid', 'true'));
		expect(fields[2]).toHaveClass('z-10');
	});

	it('a chosen suggestion fills the joined fields («Τη συμπληρώσαμε για εσάς»): the country read only, one street line, the postal code, the town; «Επόμενο» opens the pin, writing nothing', async () => {
		draw('address-confirm', { depth: 1, prepare: (ready) => ready.draft.update('office', chosen) });
		await ready();
		expect(
			screen.getByText('Τη συμπληρώσαμε για εσάς. Διορθώστε ό,τι χρειάζεται.')
		).toBeInTheDocument();
		const country = screen.getByLabelText('Χώρα');
		expect(country).toHaveValue('Ελλάδα');
		expect(country).toHaveAttribute('readonly');
		expect(screen.getByLabelText('Οδός και αριθμός')).toHaveValue('Καραΐσκου 74');
		expect(screen.getByLabelText('Ταχυδρομικός κώδικας')).toHaveValue('185 32');
		expect(screen.getByLabelText('Πόλη ή περιοχή')).toHaveValue('Πειραιάς');
		await user().click(next());
		opened('/doctor/onboarding/location/pin', 2);
		expect(
			calls.filter((call) => call.method !== 'GET' || call.path.includes('locations'))
		).toEqual([]);
	});

	it('U-65.6 (negative): each field stops at the server’s limit; the postal code keeps digits and a space only and wants 5 digits; a typed address asks OUR catalogue for its town (no Google, no cookies), Athens when it knows none', async () => {
		answers['GET /doctor/public/locations/suggestions'] = () =>
			json({ items: [{ latitude: 37.947, longitude: 23.637 }] });
		const { handle } = draw('address-confirm', {
			depth: 1,
			prepare: (ready) =>
				ready.draft.update('office', {
					streetLine: '',
					postalCode: '',
					city: '',
					latitude: null,
					longitude: null,
					placeId: null,
					pointProof: null,
					pinMoved: false,
					source: 'manual'
				})
		});
		await ready();
		expect(screen.getByText('Συμπληρώστε τη διεύθυνση του ιατρείου σας.')).toBeInTheDocument();
		const street = screen.getByLabelText('Οδός και αριθμός');
		const postal = screen.getByLabelText('Ταχυδρομικός κώδικας');
		const city = screen.getByLabelText('Πόλη ή περιοχή');
		expect(street).toHaveAttribute('maxlength', '200');
		expect(postal).toHaveAttribute('maxlength', '6');
		expect(city).toHaveAttribute('maxlength', '200');
		await user().type(street, 'Καραΐσκου 74');
		await user().type(postal, 'ab1853');
		expect(postal).toHaveValue('1853');
		await user().type(city, 'Πειραιάς');
		expect(screen.getByTestId('doctor-onboarding-postal-code-error')).toHaveTextContent(
			'Ο ταχυδρομικός κώδικας έχει 5 ψηφία.'
		);
		expect(next()).toBeDisabled();
		await user().type(postal, '2');
		await waitFor(() => expect(next()).not.toBeDisabled());
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/location/pin', 2));
		const lookup = calls.find((call) => call.path === '/doctor/public/locations/suggestions');
		expect(Object.fromEntries(new URL(lookup?.url ?? 'http://x').searchParams)).toEqual({
			q: 'Πειραιάς',
			limit: '1',
			lang: 'el'
		});
		expect(lookup?.credentials).toBe('omit');
		expect(handle.draft.edits.office).toMatchObject({ latitude: 37.947, longitude: 23.637 });
		expect(writes()).toEqual([]);
	});

	it('(negative) a town the catalogue does not know, or no answer: the pin starts in Athens', async () => {
		answers['GET /doctor/public/locations/suggestions'] = () => refusal(503, 'down');
		const { handle } = draw('address-confirm', {
			prepare: (ready) =>
				ready.draft.update('office', {
					streetLine: 'Οδός 1',
					postalCode: '10431',
					city: 'Πουθενά',
					latitude: null,
					longitude: null,
					placeId: null,
					pointProof: null,
					pinMoved: false,
					source: 'manual'
				})
		});
		await ready();
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/location/pin', 1));
		expect(handle.draft.edits.office).toMatchObject({ latitude: 37.9755, longitude: 23.7348 });
	});
});

describe('37 · «Είναι η πινέζα στο σωστό σημείο;» (record §6.7.4, 🔴 D-W3-33)', () => {
	it('the map at a doorway’s zoom around the address, the pin fixed in the middle, the doctor’s own address in the capsule, «Σύρετε τον χάρτη…» until the first move of the person', async () => {
		draw('pin', { depth: 2, prepare: (ready) => ready.draft.update('office', chosen) });
		await ready();
		const map = await made();
		expect(map.options).toMatchObject({ center: [23.64, 37.94], zoom: 17 });
		const box = screen.getByTestId('doctor-onboarding-pin-map');
		expect(inert(box.firstElementChild)).toBe(false);
		expect(box.querySelector('[data-slot="doctor-onboarding-pin"]')).not.toBeNull();
		expect(screen.getByTestId('doctor-onboarding-pin-address')).toHaveTextContent(
			'Καραΐσκου 74, 185 32 Πειραιάς'
		);
		const tip = screen.getByTestId('doctor-onboarding-pin-map-tip');
		expect(tip).toHaveTextContent('Σύρετε τον χάρτη για να μετακινήσετε την πινέζα');

		// A move of the code (a fit, «+»): the tip stays, the point stays.
		map.emit('movestart', {});
		map.center = { lng: 23.65, lat: 37.95 };
		map.emit('moveend', {});
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(screen.getByTestId('doctor-onboarding-pin-map-tip')).toBeInTheDocument();
		noHover(screen.getByTestId('doctor-onboarding-pin'));
	});

	it('🔴 D-W3-33: the person’s move keeps the centre as the office’s point and marks the pin moved; «Επόμενο» writes the office’s `address` group — Google’s place with the proof as it came — and the address’s edits go', async () => {
		answers['POST /doctor/onboarding/office'] = () =>
			json({ ...server, missing: ['OFFICE_PHONE'] });
		const { handle } = draw('pin', {
			depth: 2,
			prepare: (ready) => ready.draft.update('office', chosen)
		});
		await ready();
		const map = await made();
		map.emit('movestart', drag());
		await waitFor(() => expect(screen.queryByTestId('doctor-onboarding-pin-map-tip')).toBeNull());
		map.center = { lng: 23.6412, lat: 37.9405 };
		map.emit('moveend', drag());
		await waitFor(() =>
			expect(handle.draft.edits.office).toMatchObject({
				latitude: 37.9405,
				longitude: 23.6412,
				pinMoved: true
			})
		);
		await user().click(next());
		await waitFor(() => opened('/doctor/onboarding/office', 3));
		expect(writes()).toEqual([
			expect.objectContaining({
				path: '/doctor/onboarding/office',
				method: 'POST',
				body: {
					address: {
						streetLine: 'Καραΐσκου 74',
						postalCode: '185 32',
						city: 'Πειραιάς',
						latitude: 37.9405,
						longitude: 23.6412,
						externalPlace: {
							provider: 'GOOGLE_MAPS',
							placeId: 'ChIJplace1xyz',
							pinMoved: true,
							pointProof: PROOF
						}
					}
				}
			})
		]);
		expect(handle.draft.edits.office).toBeUndefined();
	});

	it('🔴 D-W3-33 (coordinator, the application’s review): while the address is the same, a SECOND save — «Πίσω» then «Επόμενο», «Αποθήκευση και έξοδος» — sends the progress’s place again, without a proof and never `null`', async () => {
		answers['POST /doctor/onboarding/office'] = (body) => {
			const { address } = body as {
				address: { latitude: number; longitude: number; externalPlace: { placeId: string } };
			};
			server = doctorOnboardingProgressSample({
				missing: ['OFFICE_PHONE'],
				office: {
					streetLine: 'Καραΐσκου 74',
					postalCode: '18532',
					city: 'Πειραιάς',
					latitude: address.latitude,
					longitude: address.longitude,
					placeId: address.externalPlace.placeId,
					pinMoved: false,
					phone: null,
					floor: null,
					gettingThere: null,
					parking: false,
					parkingKinds: [],
					disabilityAccess: false,
					accessibleToilet: false,
					accessibleParking: false,
					elevator: false,
					nearPublicTransport: false,
					paymentOptions: []
				}
			});
			return json(server);
		};
		const { open, handle } = draw('pin', {
			depth: 2,
			prepare: (ready) => ready.draft.update('office', chosen)
		});
		await ready();
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(writes()[0].body).toMatchObject({
			address: { externalPlace: { placeId: 'ChIJplace1xyz', pointProof: PROOF } }
		});
		// The server holds the address: its edits (and the proof with them) leave the draft.
		await waitFor(() => expect(handle.draft.edits.office).toBeUndefined());

		// «Πίσω» to the confirmation, «Επόμενο» twice: the same address, nothing changed.
		await open('address-confirm', 1);
		await ready();
		await user().click(next());
		await open('pin', 2);
		await ready();
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(2));
		// Once that write has answered (its «Επόμενο» moved on): a press while it is out waits for it instead (review
		// w3-w5 R1 NIT-1), and this one must be a save of its own.
		await waitFor(() =>
			expect(
				vi.mocked(goto).mock.calls.filter(([path]) => path === '/doctor/onboarding/office')
			).toHaveLength(2)
		);
		// …and the pill is open again: it is locked while a write is out (review w3-w6 R1 NIT-1).
		await waitFor(() =>
			expect(screen.getByTestId('doctor-onboarding-save-exit')).not.toBeDisabled()
		);
		await user().click(screen.getByTestId('doctor-onboarding-save-exit'));
		await waitFor(() => expect(writes()).toHaveLength(3));
		for (const write of writes().slice(1)) {
			expect((write.body as { address: { externalPlace: unknown } }).address.externalPlace).toEqual(
				{
					provider: 'GOOGLE_MAPS',
					placeId: 'ChIJplace1xyz',
					pinMoved: false
				}
			);
		}
		expect(calls.some((call) => call.path === '/location/address-search/details')).toBe(false);
	});

	it('🔴 review w3-w4 R1 MINOR-3 (U-112.2, no silent lock): a reload on the pin before the address was saved — no point here or on the server — gives its place to «Πού βρίσκεται», whose capsule opens the search', async () => {
		server = doctorOnboardingProgressSample({ missing: ['OFFICE_ADDRESS', 'OFFICE_PHONE'] });
		draw('pin', { depth: 3 });
		await waitFor(() => opened('/doctor/onboarding/location', 3, true));
		expect(writes()).toEqual([]);
	});

	it('(negative) with a point in the memory or on the server, the pin stays where it is', async () => {
		draw('pin', { depth: 2, prepare: (ready) => ready.draft.update('office', chosen) });
		await ready();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('review w3-w4 R1 MINOR-4 / MINOR-5 (U-81.2): the map 360 high below 744 (the application’s `hero-h`), 480 from it; its «i» says «Πηγές του χάρτη»', async () => {
		draw('pin', { depth: 2, prepare: (ready) => ready.draft.update('office', chosen) });
		await ready();
		const map = await made();
		const box = screen.getByTestId('doctor-onboarding-pin-map');
		expect(box).toHaveClass('h-hero-h', 'tablet:h-office-map-lg');
		expect(box).not.toHaveClass('h-office-map-md');
		expect(map.options.locale).toEqual({
			'Map.Title': 'Χάρτης με την πινέζα του ιατρείου',
			'AttributionControl.ToggleAttribution': 'Πηγές του χάρτη'
		});
		// NIT-3: the capsule is a paragraph with no name of its own; a reader hears «Διεύθυνση:» before the address.
		const capsule = screen.getByTestId('doctor-onboarding-pin-address');
		expect(capsule).not.toHaveAttribute('aria-label');
		expect(within(capsule).getByText('Διεύθυνση:')).toHaveClass('sr-only');
	});

	it('review w3-w4 R1 NIT-2 (U-84): a session that ended under the search opens the sign-in at once — never «the search is unavailable»', async () => {
		answers['POST /location/address-search/suggestions'] = () => refusal(401, 'expired');
		const { handle } = draw('address-search', { depth: 1 });
		const input = await screen.findByTestId('doctor-onboarding-address-field');
		await user().type(input, 'Καρα');
		await waitFor(() => expect(handle.session.flowOpen).toBe(true));
		expect(screen.queryByText(/Η αναζήτηση δεν είναι διαθέσιμη/u)).toBeNull();
	});

	it('🔴 D-W3-33 (negative): after a reload the proof is gone — the saved place travels without one and the server judges it; a typed address travels with no place at all', async () => {
		server = doctorOnboardingProgressSample({
			missing: ['OFFICE_PHONE'],
			office: {
				streetLine: 'Καραΐσκου 74',
				postalCode: '18532',
				city: 'Πειραιάς',
				latitude: 37.94,
				longitude: 23.64,
				placeId: 'ChIJsaved12345',
				pinMoved: false,
				phone: null,
				floor: null,
				gettingThere: null,
				parking: false,
				parkingKinds: [],
				disabilityAccess: false,
				accessibleToilet: false,
				accessibleParking: false,
				elevator: false,
				nearPublicTransport: false,
				paymentOptions: []
			}
		});
		const first = draw('pin');
		await ready();
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect((writes()[0].body as { address: unknown }).address).toMatchObject({
			postalCode: '185 32',
			externalPlace: { provider: 'GOOGLE_MAPS', placeId: 'ChIJsaved12345', pinMoved: false }
		});
		expect(
			(writes()[0].body as { address: { externalPlace: object } }).address.externalPlace
		).not.toHaveProperty('pointProof');
		first.view.unmount();

		calls = [];
		draw('pin', {
			prepare: (ready) =>
				ready.draft.update('office', {
					...chosen,
					placeId: null,
					pointProof: null,
					source: 'manual'
				})
		});
		await ready();
		await user().click(next());
		await waitFor(() => expect(writes()).toHaveLength(1));
		expect(
			(writes()[0].body as { address: { externalPlace: unknown } }).address.externalPlace
		).toBeNull();
	});
});
