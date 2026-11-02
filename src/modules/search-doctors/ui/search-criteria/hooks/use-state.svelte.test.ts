import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { toCriteriaLocationOption } from '$modules/search-doctors/lib/criteria-locations';
import type { CriteriaSuggestionOption } from '$modules/search-doctors/lib/criteria-suggestions';
import {
	defaultSearchDoctorsCriteria,
	getSearchCriteriaOptions,
	type SearchDoctorsCriteria
} from '$modules/search-doctors/lib/search-criteria';
import { forgetDeviceLocation, readFreshDeviceLocation } from '$shared/state/device-location';
import type { DeviceLocationResult } from '$shared/lib/location';
import { CriteriaState } from './use-state.svelte';

const { resolveDeviceLocation } = vi.hoisted(() => ({ resolveDeviceLocation: vi.fn() }));
vi.mock('$shared/lib/location', async (importOriginal) => ({
	...(await importOriginal<typeof import('$shared/lib/location')>()),
	resolveDeviceLocation
}));

const actualLocation =
	await vi.importActual<typeof import('$shared/lib/location')>('$shared/lib/location');

type Rendered = {
	state: CriteriaState;
	onClose: ReturnType<typeof vi.fn>;
	onSubmit: ReturnType<typeof vi.fn>;
	unmount: () => void;
};

/**
 * The application's `renderHook(useCriteriaModalState, { visible: true })`: the state set up in a root (its
 * teardown is the unmount) and opened, here on the phone's window.
 */
function renderState(initialCriteria?: SearchDoctorsCriteria): Rendered {
	const onClose = vi.fn();
	const onSubmit = vi.fn();
	let state!: CriteriaState;
	const unmount = $effect.root(() => {
		state = new CriteriaState({
			onClose,
			onSubmit,
			currentLocationLabel: () => 'Near me',
			initialCriteria: initialCriteria ? () => initialCriteria : undefined
		});
	});
	flushSync();
	state.open('sheet');
	return { state, onClose, onSubmit, unmount };
}

const whereOptions = getSearchCriteriaOptions('where', '');
const currentLocationOption = whereOptions.find((option) => option.value === 'current-location')!;
const attiki = whereOptions.find((option) => option.value === 'attiki')!;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// The application's `module::useCriteriaModalState` spec, title for title (S-01.6). Where U-23.2 changes the flow (a
// choice opens the NEXT card instead of closing them all; one card is always open), the test says so and why.
describe('module::useCriteriaModalState', () => {
	// A block, not an arrow's value: a function a hook returns is run as its cleanup (the mock itself here).
	beforeEach(() => {
		resolveDeviceLocation.mockReset();
		// The application's `resetAppStoreState`: the position of the visit is forgotten between tests.
		forgetDeviceLocation();
	});

	it('starts with the what section expanded and no secondary panel open', () => {
		const { state } = renderState();
		expect(state.expandedField).toBe('what');
		expect(state.activeSearchPanel).toBeNull();
	});

	it('opens the where secondary panel, collapsing the accordion', () => {
		const { state } = renderState();
		state.openSearchPanel('where');
		expect(state.activeSearchPanel).toBe('where');
		expect(state.expandedField).toBeNull();
		expect(state.queries.where).toBe('');
	});

	it('keeps only one secondary panel open at a time', () => {
		const { state } = renderState();
		state.openSearchPanel('where');
		state.openSearchPanel('what');
		expect(state.activeSearchPanel).toBe('what');
	});

	// Rewritten for U-23.2 (the application closes every card; the approved flow opens «Πότε» after «Πού»), and the
	// web's static «Πού» region is «Αττική» (the application's mock «Πειραιάς» option is on no screen).
	it('selecting a where region writes the value, resets its query, and closes the panel', () => {
		const { state } = renderState();
		state.openSearchPanel('where');
		state.updateQuery('where', 'αττ');
		state.selectOption('where', attiki);
		expect(state.criteria.where).toBe('attiki');
		expect(state.queries.where).toBe('');
		expect(state.activeSearchPanel).toBeNull();
		expect(state.expandedField).toBe('availability');
	});

	it('closeOrCollapse dismisses the active panel before collapsing or closing', () => {
		const { state, onClose } = renderState();
		state.openSearchPanel('where');
		// First: the open panel is dismissed and nothing else happens.
		state.closeOrCollapse();
		expect(state.activeSearchPanel).toBeNull();
		expect(onClose).not.toHaveBeenCalled();
		// With no panel, the window closes.
		state.closeOrCollapse();
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	// Rewritten for U-23.2: one card is always open (the prototype has no state with every card folded), so Escape
	// after the typing page closes the window; the open card stays the one the user chose.
	it('closeOrCollapse collapses an expanded section before closing the modal — web (U-23.2): one card stays open, so it closes at once', () => {
		const { state, onClose } = renderState();
		state.updateExpandedField('availability');
		expect(state.expandedField).toBe('availability');
		state.closeOrCollapse();
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(state.visible).toBe(false);
	});

	it('mirrors what/where by writing the typed query into criteria', () => {
		const { state } = renderState();
		state.updateQuery('what', 'derm');
		state.updateQuery('where', 'ath');
		expect(state.criteria.what).toBe('derm');
		expect(state.criteria.where).toBe('ath');
	});

	describe('device-location selection', () => {
		it('S-11.2: commits «Κοντά μου» («Near me») with the device coordinates when granted', async () => {
			resolveDeviceLocation.mockResolvedValue({
				status: 'granted',
				coords: { latitude: 37.9838, longitude: 23.7275 }
			});
			const { state } = renderState();
			state.openSearchPanel('where');
			state.selectOption('where', currentLocationOption);
			await flush();
			expect(state.criteria.where).toBe('current-location');
			// The structured selection carries the localized current-location label plus the coordinates.
			expect(state.criteria.whereSelection).toEqual({
				kind: 'current-location',
				label: 'Near me',
				latitude: 37.9838,
				longitude: 23.7275
			});
			expect(state.activeSearchPanel).toBeNull();
			expect(state.locationError).toBeNull();
			expect(state.deviceLocation).toMatchObject({ latitude: 37.9838, longitude: 23.7275 });
		});

		// The web: a page can neither ask the browser again nor open its settings, so `canAskAgain` is always false
		// there — the application's «permanently blocked» case; the web's message offers no settings action.
		it('does not select and surfaces a settings-capable denied error when permanently blocked', async () => {
			resolveDeviceLocation.mockResolvedValue({ status: 'denied', canAskAgain: false });
			const { state } = renderState();
			state.selectOption('where', currentLocationOption);
			await flush();
			expect(state.criteria.where).toBe('');
			expect(state.locationError).toEqual({ kind: 'denied', canOpenSettings: true });
			expect(state.deviceLocation).toBeNull();
		});

		it('surfaces a denied error without a settings action when the prompt can be shown again', async () => {
			resolveDeviceLocation.mockResolvedValue({ status: 'denied', canAskAgain: true });
			const { state } = renderState();
			state.selectOption('where', currentLocationOption);
			await flush();
			expect(state.locationError).toEqual({ kind: 'denied', canOpenSettings: false });
			expect(state.criteria.where).toBe('');
		});

		it('surfaces an unavailable error with no settings action', async () => {
			resolveDeviceLocation.mockResolvedValue({ status: 'unavailable' });
			const { state } = renderState();
			state.selectOption('where', currentLocationOption);
			await flush();
			expect(state.locationError).toEqual({ kind: 'unavailable' });
			expect(state.criteria.where).toBe('');
		});

		it('clears the location error when a normal option is picked next', async () => {
			resolveDeviceLocation.mockResolvedValue({ status: 'unavailable' });
			const { state } = renderState();
			state.selectOption('where', currentLocationOption);
			await flush();
			expect(state.locationError).toEqual({ kind: 'unavailable' });
			state.selectOption('where', attiki);
			expect(state.criteria.where).toBe('attiki');
			expect(state.locationError).toBeNull();
		});

		it('exposes the pending flag while the fix is being read and clears it after', async () => {
			let resolvePending: (value: DeviceLocationResult) => void = () => {};
			resolveDeviceLocation.mockImplementation(
				() => new Promise<DeviceLocationResult>((resolve) => (resolvePending = resolve))
			);
			const { state } = renderState();
			state.selectOption('where', currentLocationOption);
			expect(state.isResolvingLocation).toBe(true);
			resolvePending({ status: 'granted', coords: { latitude: 1, longitude: 2 } });
			await flush();
			expect(state.isResolvingLocation).toBe(false);
		});

		it('drops a late granted result when a manual region was picked mid-flight', async () => {
			let resolvePending: (value: DeviceLocationResult) => void = () => {};
			resolveDeviceLocation.mockImplementation(
				() => new Promise<DeviceLocationResult>((resolve) => (resolvePending = resolve))
			);
			const { state } = renderState();
			state.selectOption('where', currentLocationOption);
			// The user explicitly picks a normal region while the fix is still resolving.
			state.selectOption('where', attiki);
			expect(state.criteria.where).toBe('attiki');
			resolvePending({ status: 'granted', coords: { latitude: 1, longitude: 2 } });
			await flush();
			// The stale grant is ignored: the explicit choice stands and no coords are stored.
			expect(state.criteria.where).toBe('attiki');
			expect(state.deviceLocation).toBeNull();
		});

		it('guards a double-tap so only one resolution flow runs', async () => {
			let resolvePending: (value: DeviceLocationResult) => void = () => {};
			resolveDeviceLocation.mockImplementation(
				() => new Promise<DeviceLocationResult>((resolve) => (resolvePending = resolve))
			);
			const { state } = renderState();
			state.selectOption('where', currentLocationOption);
			state.selectOption('where', currentLocationOption);
			expect(resolveDeviceLocation).toHaveBeenCalledTimes(1);
			resolvePending({ status: 'granted', coords: { latitude: 1, longitude: 2 } });
			await flush();
			expect(state.criteria.where).toBe('current-location');
		});
	});

	describe('S-32.2: «Αναζήτηση» while the position is being read', () => {
		let resolvePending: (value: DeviceLocationResult) => void = () => {};

		beforeEach(() => {
			resolveDeviceLocation.mockImplementation(
				() => new Promise<DeviceLocationResult>((resolve) => (resolvePending = resolve))
			);
		});

		it('S-32.2: waits for the position and searches «Κοντά μου» with it, once', async () => {
			const { state, onSubmit } = renderState();
			state.selectOption('where', currentLocationOption);
			state.submitCriteria();
			state.submitCriteria();
			expect(onSubmit).not.toHaveBeenCalled();
			expect(state.isSubmitPending).toBe(true);
			resolvePending({ status: 'granted', coords: { latitude: 37.943, longitude: 23.647 } });
			await flush();
			expect(onSubmit).toHaveBeenCalledTimes(1);
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					where: 'current-location',
					whereSelection: {
						kind: 'current-location',
						label: 'Near me',
						latitude: 37.943,
						longitude: 23.647
					}
				})
			);
			expect(onSubmit).not.toHaveBeenCalledWith(expect.objectContaining({ whereSelection: null }));
			expect(state.isSubmitPending).toBe(false);
		});

		it.each([
			[
				'a refused permission',
				{ status: 'denied', canAskAgain: false } as const,
				{ kind: 'denied', canOpenSettings: true }
			],
			['no position', { status: 'unavailable' } as const, { kind: 'unavailable' }]
		])(
			'S-32.2: on %s searches nothing and opens «Πού;» on the message',
			async (_, outcome, error) => {
				const { state, onSubmit } = renderState();
				state.updateExpandedField('availability');
				state.selectOption('where', currentLocationOption);
				state.submitCriteria();
				resolvePending(outcome);
				await flush();
				expect(onSubmit).not.toHaveBeenCalled();
				expect(state.locationError).toEqual(error);
				expect(state.expandedField).toBe('where');
				expect(state.isSubmitPending).toBe(false);
			}
		);

		it.each([
			['another area is picked', (state: CriteriaState) => state.selectOption('where', attiki)],
			['«Πού;» is typed into', (state: CriteriaState) => state.updateQuery('where', 'Πειρ')],
			['all criteria are cleared', (state: CriteriaState) => state.resetCriteria()]
		])(
			'S-32.2: drops the waiting search when %s, and the next press searches at once',
			async (_, move) => {
				const { state, onSubmit } = renderState();
				state.selectOption('where', currentLocationOption);
				state.submitCriteria();
				move(state);
				expect(state.isSubmitPending).toBe(false);
				resolvePending({ status: 'granted', coords: { latitude: 1, longitude: 2 } });
				await flush();
				expect(onSubmit).not.toHaveBeenCalled();
				expect(state.criteria.whereSelection?.kind).not.toBe('current-location');
				state.submitCriteria();
				expect(onSubmit).toHaveBeenCalledTimes(1);
			}
		);

		it('S-32.2: drops the waiting search when the modal closes, and reopens with a plain button', async () => {
			const { state, onSubmit } = renderState();
			state.selectOption('where', currentLocationOption);
			state.submitCriteria();
			state.close();
			state.open('sheet');
			expect(state.isSubmitPending).toBe(false);
			resolvePending({ status: 'granted', coords: { latitude: 1, longitude: 2 } });
			await flush();
			expect(onSubmit).not.toHaveBeenCalled();
		});

		it('S-32.2: an unmount drops the waiting search: a late position searches nothing and writes no location', async () => {
			const { state, onSubmit, unmount } = renderState();
			state.selectOption('where', currentLocationOption);
			state.submitCriteria();
			expect(state.isSubmitPending).toBe(true);
			unmount();
			resolvePending({ status: 'granted', coords: { latitude: 37.943, longitude: 23.647 } });
			await flush();
			expect(onSubmit).not.toHaveBeenCalled();
			expect(state.deviceLocation).toBeNull();
		});

		it('S-32.2: searches at once when no position is being read, before or after «Κοντά μου»', async () => {
			const { state, onSubmit } = renderState();
			state.submitCriteria();
			expect(onSubmit).toHaveBeenCalledTimes(1);
			state.selectOption('where', currentLocationOption);
			resolvePending({ status: 'granted', coords: { latitude: 1, longitude: 2 } });
			await flush();
			state.submitCriteria();
			expect(onSubmit).toHaveBeenCalledTimes(2);
			expect(onSubmit).toHaveBeenLastCalledWith(
				expect.objectContaining({
					whereSelection: expect.objectContaining({ kind: 'current-location' })
				})
			);
		});
	});

	// A Svelte state reads the newest value at once: the application's «press of an older render» is the same press.
	describe('S-32.2: no «Αναζήτηση» is lost while «Κοντά μου» reads the position (Ε-31)', () => {
		let resolvePending: (value: DeviceLocationResult) => void = () => {};
		const granted = { status: 'granted', coords: { latitude: 37.943, longitude: 23.647 } } as const;
		const nearMe = {
			kind: 'current-location',
			label: 'Near me',
			latitude: 37.943,
			longitude: 23.647
		};
		const fromAttica = { ...defaultSearchDoctorsCriteria, what: 'Cardiology', where: 'attiki' };

		beforeEach(() => {
			resolveDeviceLocation.mockImplementation(
				() => new Promise<DeviceLocationResult>((resolve) => (resolvePending = resolve))
			);
		});

		it('S-32.2: «Κοντά μου» picked in the «Πού;» panel closes it at once, onto «Πού;» and its busy row', async () => {
			const { state, onSubmit } = renderState(fromAttica);
			state.openSearchPanel('where');
			state.selectOption('where', currentLocationOption);
			expect(state.activeSearchPanel).toBeNull();
			expect(state.expandedField).toBe('where');
			expect(state.isResolvingLocation).toBe(true);
			state.submitCriteria();
			expect(state.isSubmitPending).toBe(true);
			resolvePending(granted);
			await flush();
			expect(onSubmit).toHaveBeenCalledTimes(1);
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({ where: 'current-location', whereSelection: nearMe })
			);
		});

		it('S-32.2: a press handled before «Κοντά μου» re-rendered still waits and searches «Κοντά μου»', async () => {
			const { state, onSubmit } = renderState(fromAttica);
			const pressBeforeRender = () => state.submitCriteria();
			state.selectOption('where', currentLocationOption);
			pressBeforeRender();
			expect(onSubmit).not.toHaveBeenCalled();
			resolvePending(granted);
			await flush();
			expect(onSubmit).toHaveBeenCalledTimes(1);
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ whereSelection: nearMe }));
		});

		it('S-32.2: a press handled after the position arrived, before the re-render, searches «Κοντά μου», never Αττική', async () => {
			const { state, onSubmit } = renderState(fromAttica);
			state.selectOption('where', currentLocationOption);
			const pressOfTheReadingRender = () => state.submitCriteria();
			resolvePending(granted);
			await flush();
			pressOfTheReadingRender();
			expect(onSubmit).toHaveBeenCalledTimes(1);
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({ where: 'current-location', whereSelection: nearMe })
			);
			expect(onSubmit).not.toHaveBeenCalledWith(expect.objectContaining({ where: 'attiki' }));
		});

		it('S-32.2: a press that waited, and another while the answer re-renders, both search «Κοντά μου»', async () => {
			const { state, onSubmit } = renderState(fromAttica);
			state.selectOption('where', currentLocationOption);
			state.submitCriteria();
			const pressOfTheWaitingRender = () => state.submitCriteria();
			resolvePending(granted);
			await flush();
			pressOfTheWaitingRender();
			expect(onSubmit).toHaveBeenCalled();
			expect(onSubmit.mock.calls.map(([criteria]) => criteria.whereSelection)).toEqual(
				onSubmit.mock.calls.map(() => nearMe)
			);
		});
	});

	// Through the REAL 10″ of `shared/lib/location` on the browser's Geolocation API (the web's device).
	describe('S-34.3: no position within 10″', () => {
		const getCurrentPosition = vi.fn();
		const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
		const originalPermissions = Object.getOwnPropertyDescriptor(navigator, 'permissions');

		beforeEach(() => {
			vi.useFakeTimers();
			resolveDeviceLocation.mockImplementation(actualLocation.resolveDeviceLocation);
			getCurrentPosition.mockReset();
			getCurrentPosition.mockImplementation(() => {});
			Object.defineProperty(navigator, 'geolocation', {
				configurable: true,
				value: { getCurrentPosition }
			});
			Object.defineProperty(navigator, 'permissions', {
				configurable: true,
				value: { query: vi.fn().mockResolvedValue({ state: 'granted' }) }
			});
		});

		afterEach(() => {
			vi.useRealTimers();
			if (originalGeolocation) Object.defineProperty(navigator, 'geolocation', originalGeolocation);
			else Reflect.deleteProperty(navigator, 'geolocation');
			if (originalPermissions) Object.defineProperty(navigator, 'permissions', originalPermissions);
			else Reflect.deleteProperty(navigator, 'permissions');
		});

		it('S-34.3: at 10″ opens «Πού;» on the message, keeps the window open and searches nothing', async () => {
			const { state, onClose, onSubmit } = renderState();
			state.selectOption('where', currentLocationOption);
			state.submitCriteria();
			await vi.advanceTimersByTimeAsync(9_999);
			expect(state.isResolvingLocation).toBe(true);
			expect(state.isSubmitPending).toBe(true);
			expect(state.locationError).toBeNull();
			await vi.advanceTimersByTimeAsync(1);
			expect(state.locationError).toEqual({ kind: 'unavailable' });
			expect(state.expandedField).toBe('where');
			expect(state.isResolvingLocation).toBe(false);
			expect(state.isSubmitPending).toBe(false);
			expect(state.criteria.whereSelection).toBeNull();
			expect(onSubmit).not.toHaveBeenCalled();
			expect(onClose).not.toHaveBeenCalled();
			expect(state.deviceLocation).toBeNull();
		});

		it('S-34.3: «Κοντά μου» after the limit asks the device again, and a position then searches «Κοντά μου»', async () => {
			const { state, onSubmit } = renderState();
			state.selectOption('where', currentLocationOption);
			await vi.advanceTimersByTimeAsync(10_000);
			expect(state.locationError).toEqual({ kind: 'unavailable' });
			getCurrentPosition.mockImplementation((success: PositionCallback) =>
				success({ coords: { latitude: 37.943, longitude: 23.647 } } as GeolocationPosition)
			);
			state.selectOption('where', currentLocationOption);
			state.submitCriteria();
			await vi.advanceTimersByTimeAsync(0);
			expect(getCurrentPosition).toHaveBeenCalledTimes(2);
			expect(state.locationError).toBeNull();
			expect(onSubmit).toHaveBeenCalledTimes(1);
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					where: 'current-location',
					whereSelection: {
						kind: 'current-location',
						label: 'Near me',
						latitude: 37.943,
						longitude: 23.647
					}
				})
			);
		});
	});

	describe('what selection', () => {
		const specialtyOption: CriteriaSuggestionOption = {
			kind: 'professional',
			value: 'prof-1',
			label: 'Cardiology',
			id: 'prof-1',
			slug: 'cardiology'
		};
		const serviceOption: CriteriaSuggestionOption = {
			kind: 'service',
			value: 'video-consultation',
			label: 'Video consultation',
			slug: 'video-consultation'
		};

		// Rewritten for U-23.2: a «Τι» choice opens «Πού» (the application closes every card).
		it('commits a specialty as a professional selection and closes the panel', () => {
			const { state } = renderState();
			state.openSearchPanel('what');
			state.commitWhatSelection(specialtyOption);
			expect(state.criteria.what).toBe('Cardiology');
			expect(state.criteria.whatSelection).toEqual({
				kind: 'professional',
				label: 'Cardiology',
				id: 'prof-1',
				slug: 'cardiology'
			});
			expect(state.activeSearchPanel).toBeNull();
			expect(state.expandedField).toBe('where');
		});

		it('commits a service as a service selection', () => {
			const { state } = renderState();
			state.commitWhatSelection(serviceOption);
			expect(state.criteria.whatSelection).toEqual({
				kind: 'service',
				label: 'Video consultation',
				slug: 'video-consultation'
			});
		});

		it('drops a prior structured selection when the user types free text', () => {
			const { state } = renderState();
			state.commitWhatSelection(specialtyOption);
			state.updateQuery('what', 'cardio');
			expect(state.criteria.what).toBe('cardio');
			expect(state.criteria.whatSelection).toBeNull();
		});

		it('clears the what field and its selection together', () => {
			const { state } = renderState();
			state.commitWhatSelection(specialtyOption);
			state.clearField('what');
			expect(state.criteria.what).toBe('');
			expect(state.criteria.whatSelection).toBeNull();
		});
	});

	describe('where selection', () => {
		const locationOption = toCriteriaLocationOption({
			slug: 'peiraias-dimos-peiraia-attiki',
			type: 'MUNICIPALITY',
			label: 'Πειραιάς',
			displayName: 'Πειραιάς, Δήμος Πειραιά, Αττική',
			context: 'Περιφερειακή Ενότητα Πειραιώς, Αττική',
			hierarchy: {
				region: 'Αττική',
				regionalUnit: 'Περιφερειακή Ενότητα Πειραιά',
				municipality: null
			},
			latitude: 37.9425,
			longitude: 23.6465
		});

		// Rewritten for U-23.2: a «Πού» choice opens «Πότε» (the application closes every card).
		it('S-17 / S-20.1: a tapped «Πειραιάς» row writes «Πειραιάς» in the field and keeps its server slug', () => {
			const { state } = renderState();
			state.openSearchPanel('where');
			state.commitWhereLocation(locationOption);
			expect(state.criteria.where).toBe('Πειραιάς');
			expect(state.criteria.whereSelection).toEqual({
				kind: 'location',
				label: 'Πειραιάς',
				slug: 'peiraias-dimos-peiraia-attiki',
				locationType: 'MUNICIPALITY'
			});
			expect(state.activeSearchPanel).toBeNull();
			expect(state.expandedField).toBe('availability');
		});

		it('drops the structured where selection when the user types free text', () => {
			const { state } = renderState();
			state.commitWhereLocation(locationOption);
			state.updateQuery('where', 'ath');
			expect(state.criteria.where).toBe('ath');
			expect(state.criteria.whereSelection).toBeNull();
		});

		it('S-19.1: the ready «Αττική» row searches Αττική, exactly as today: picking it drops the structured where selection', () => {
			const { state } = renderState();
			state.commitWhereLocation(locationOption);
			state.selectOption('where', attiki);
			expect(state.criteria.where).toBe('attiki');
			expect(state.criteria.whereSelection).toBeNull();
		});

		it('clears the where field and its selection together', () => {
			const { state } = renderState();
			state.commitWhereLocation(locationOption);
			state.clearField('where');
			expect(state.criteria.where).toBe('');
			expect(state.criteria.whereSelection).toBeNull();
		});
	});

	describe('web (U-23.2)', () => {
		it('U-23.2: a choice opens the next card — «Τι» ⇒ «Πού» ⇒ «Πότε», which stays open on its ✓', () => {
			const { state } = renderState();
			const when = getSearchCriteriaOptions('availability', '').find(
				(option) => option.value === 'next3Days'
			)!;
			state.commitWhatSelection({
				kind: 'professional',
				value: 'p',
				label: 'Καρδιολόγος',
				id: 'p'
			});
			expect(state.expandedField).toBe('where');
			state.selectOption('where', attiki);
			expect(state.expandedField).toBe('availability');
			state.selectOption('availability', when);
			expect(state.criteria.availability).toBe('next3Days');
			expect(state.expandedField).toBe('availability');
		});

		it('U-23.2: back from the typing page lands on the card it came from; «Διαγραφή όλων» opens «Τι» on empty criteria', () => {
			const { state } = renderState();
			state.updateExpandedField('where');
			state.openSearchPanel('where');
			state.closeSearchPanel();
			expect(state.expandedField).toBe('where');
			state.updateQuery('what', 'καρ');
			state.resetCriteria();
			expect(state.criteria).toEqual(defaultSearchDoctorsCriteria);
			expect(state.expandedField).toBe('what');
		});

		it('U-23.2 (negative): the home keeps what it gathered across opens; a close loses nothing', () => {
			const { state } = renderState();
			state.selectOption('where', attiki);
			state.close();
			expect(state.visible).toBe(false);
			state.open('bar', 'where');
			expect(state.surface).toBe('bar');
			expect(state.criteria.where).toBe('attiki');
			expect(state.expandedField).toBe('where');
		});
	});

	describe('S-32.2 (web): a position request the browser never answers', () => {
		let resolvePending: (value: DeviceLocationResult) => void = () => {};
		let reads = 0;

		beforeEach(() => {
			reads = 0;
			resolveDeviceLocation.mockImplementation(() => {
				reads += 1;
				return new Promise<DeviceLocationResult>((resolve) => (resolvePending = resolve));
			});
		});

		it('S-32.2 (web): closing with a position request pending ⇒ on the next open the «Πού» rows work; the late position writes nothing', async () => {
			const { state, onSubmit } = renderState();
			state.selectOption('where', currentLocationOption);
			state.submitCriteria();
			const stale = resolvePending;
			expect(state.isResolvingLocation).toBe(true);
			state.close();
			state.open('sheet', 'where');
			// The rows are free again (no spinner, nothing locked) and nothing waits to search.
			expect(state.isResolvingLocation).toBe(false);
			expect(state.isSubmitPending).toBe(false);
			// A new «Κοντά μου» asks again: the first request no longer blocks it.
			state.selectOption('where', currentLocationOption);
			expect(reads).toBe(2);
			expect(state.isResolvingLocation).toBe(true);
			state.submitCriteria();
			// The first request answers late: it commits nothing, remembers nothing, and does not free the new read.
			stale({ status: 'granted', coords: { latitude: 1, longitude: 2 } });
			await flush();
			expect(state.criteria.whereSelection).toBeNull();
			expect(readFreshDeviceLocation()).toBeNull();
			expect(state.isResolvingLocation).toBe(true);
			expect(state.isSubmitPending).toBe(true);
			expect(onSubmit).not.toHaveBeenCalled();
			// The new read's answer is the one that counts.
			resolvePending({ status: 'granted', coords: { latitude: 37.943, longitude: 23.647 } });
			await flush();
			expect(state.isResolvingLocation).toBe(false);
			expect(onSubmit).toHaveBeenCalledTimes(1);
			expect(readFreshDeviceLocation()).toEqual({ latitude: 37.943, longitude: 23.647 });
		});
	});
});
