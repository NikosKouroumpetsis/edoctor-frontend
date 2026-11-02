import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_LOCATION_TIMEOUT_MS, resolveDeviceLocation, type DeviceLocationResult } from '.';

type Success = (position: { coords: { latitude: number; longitude: number } }) => void;
type Failure = (error: { code: number }) => void;

/** jsdom has no geolocation: the browser's two APIs, stubbed for one test (undone after it). */
function stubBrowser(options: {
	permission?: PermissionState | 'missing';
	position: (success: Success, failure: Failure, settings: PositionOptions) => void;
}) {
	const getCurrentPosition = vi.fn(options.position);
	const query = vi.fn(async () => ({ state: options.permission ?? 'prompt' }));
	vi.stubGlobal('navigator', {
		...navigator,
		geolocation: { getCurrentPosition },
		permissions: options.permission === 'missing' ? undefined : { query }
	});
	return { getCurrentPosition, query };
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('shared::lib::location', () => {
	it('S-07.3: the browser’s position, the coordinates alone', async () => {
		const { getCurrentPosition } = stubBrowser({
			permission: 'granted',
			position: (success) =>
				success({ coords: { latitude: 37.943, longitude: 23.647, accuracy: 12 } as never })
		});
		await expect(resolveDeviceLocation()).resolves.toEqual({
			status: 'granted',
			coords: { latitude: 37.943, longitude: 23.647 }
		});
		expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({
			enableHighAccuracy: false,
			timeout: DEVICE_LOCATION_TIMEOUT_MS
		});
	});

	it('S-07.3 (negative): a refusal is `denied`, before asking or at the prompt, never a position', async () => {
		const blocked = stubBrowser({ permission: 'denied', position: () => undefined });
		await expect(resolveDeviceLocation()).resolves.toEqual({
			status: 'denied',
			canAskAgain: false
		});
		expect(blocked.getCurrentPosition).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
		stubBrowser({ permission: 'prompt', position: (_, failure) => failure({ code: 1 }) });
		await expect(resolveDeviceLocation()).resolves.toEqual({
			status: 'denied',
			canAskAgain: false
		});
	});

	it('S-07.3 (negative): no position, a timeout or no geolocation at all is `unavailable`', async () => {
		stubBrowser({ permission: 'missing', position: (_, failure) => failure({ code: 2 }) });
		await expect(resolveDeviceLocation()).resolves.toEqual({ status: 'unavailable' });
		vi.unstubAllGlobals();
		stubBrowser({ position: (_, failure) => failure({ code: 3 }) });
		await expect(resolveDeviceLocation()).resolves.toEqual({ status: 'unavailable' });
		vi.unstubAllGlobals();
		vi.stubGlobal('navigator', { ...navigator, geolocation: undefined });
		await expect(resolveDeviceLocation()).resolves.toEqual({ status: 'unavailable' });
	});

	/**
	 * 🔴 S-34.3, the application's eight guards title for title (`shared/lib/location` spec): the position is awaited
	 * 10″ counted from after the permission — on the web the page's own clock runs only once the permission is
	 * `granted`; while the browser's prompt is open no clock of the page runs and the browser's `timeout` counts
	 * only after the answer (the Geolocation API) — then `unavailable`; a later position is dropped, no timer
	 * outlives an answer.
	 */
	describe('S-34.3: the position is awaited 10″, counted from after the permission', () => {
		const athensCoords = { latitude: 37.9838, longitude: 23.7275 };
		let deliver: (coords: typeof athensCoords) => void = () => {};
		let fail: (code: number) => void = () => {};
		let browser: ReturnType<typeof stubBrowser>;

		function stubPending(permission: PermissionState) {
			browser = stubBrowser({
				permission,
				position: (success, failure) => {
					deliver = (coords) => success({ coords });
					fail = (code) => failure({ code });
				}
			});
		}

		beforeEach(() => {
			vi.useFakeTimers();
			stubPending('granted');
		});

		/** Starts one read and hands back what it answered so far (`undefined` while it still waits). */
		function startRead() {
			const read: { outcome?: DeviceLocationResult } = {};
			void resolveDeviceLocation().then((outcome) => {
				read.outcome = outcome;
			});
			return read;
		}

		it('S-34.3: the limit is 10 seconds, a named constant', () => {
			expect(DEVICE_LOCATION_TIMEOUT_MS).toBe(10_000);
		});

		it('S-34.3: at 9.999″ it still waits; at 10″ it answers unavailable and leaves no timer', async () => {
			const read = startRead();
			await vi.advanceTimersByTimeAsync(9_999);
			expect(read.outcome).toBeUndefined();
			await vi.advanceTimersByTimeAsync(1);
			expect(read.outcome).toEqual({ status: 'unavailable' });
			expect(vi.getTimerCount()).toBe(0);
		});

		it('S-34.3: a position landing after the limit is ignored', async () => {
			const read = startRead();
			await vi.advanceTimersByTimeAsync(10_000);
			deliver(athensCoords);
			await vi.advanceTimersByTimeAsync(0);
			expect(read.outcome).toEqual({ status: 'unavailable' });
		});

		// Web: the browser asks for the position at once and shows its prompt; the page starts no clock of its own and
		// hands the browser the 10″, which it counts only after the answer.
		it('S-34.3: the time the permission prompt stays open does not count', async () => {
			stubPending('prompt');
			const read = startRead();
			await vi.advanceTimersByTimeAsync(30_000);
			expect(read.outcome).toBeUndefined();
			expect(vi.getTimerCount()).toBe(0);
			expect(browser.getCurrentPosition.mock.calls[0][2]).toMatchObject({
				timeout: DEVICE_LOCATION_TIMEOUT_MS
			});
			deliver(athensCoords);
			await vi.advanceTimersByTimeAsync(0);
			expect(read.outcome).toEqual({ status: 'granted', coords: athensCoords });
		});

		it('S-34.3: a position before the limit wins and clears the timer', async () => {
			const read = startRead();
			await vi.advanceTimersByTimeAsync(2_000);
			expect(vi.getTimerCount()).toBe(1);
			deliver(athensCoords);
			await vi.advanceTimersByTimeAsync(0);
			expect(read.outcome).toEqual({ status: 'granted', coords: athensCoords });
			expect(vi.getTimerCount()).toBe(0);
		});

		it('S-34.3: a failure before the limit is unavailable and clears the timer', async () => {
			const read = startRead();
			await vi.advanceTimersByTimeAsync(3_000);
			fail(2);
			await vi.advanceTimersByTimeAsync(0);
			expect(read.outcome).toEqual({ status: 'unavailable' });
			expect(vi.getTimerCount()).toBe(0);
		});

		it('S-34.3: a refused permission reads no position and starts no timer', async () => {
			stubPending('denied');
			const read = startRead();
			await vi.advanceTimersByTimeAsync(0);
			expect(read.outcome).toEqual({ status: 'denied', canAskAgain: false });
			expect(browser.getCurrentPosition).not.toHaveBeenCalled();
			expect(vi.getTimerCount()).toBe(0);
		});

		it('S-34.3: a new try after the limit asks the device again, with a limit of its own', async () => {
			const first = startRead();
			await vi.advanceTimersByTimeAsync(10_000);
			expect(first.outcome).toEqual({ status: 'unavailable' });
			const second = startRead();
			await vi.advanceTimersByTimeAsync(9_999);
			expect(second.outcome).toBeUndefined();
			deliver(athensCoords);
			await vi.advanceTimersByTimeAsync(0);
			expect(browser.getCurrentPosition).toHaveBeenCalledTimes(2);
			expect(second.outcome).toEqual({ status: 'granted', coords: athensCoords });
			expect(vi.getTimerCount()).toBe(0);
		});
	});
});
