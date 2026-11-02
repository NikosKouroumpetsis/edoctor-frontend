/**
 * The device's position for «Κοντά μου» (the application's `shared/lib/location`, S-07.3 rule 12: on the web from the
 * browser), as data, never thrown: `granted` with the coordinates alone (nothing else of the position leaves here),
 * `denied` when the browser refuses (a web page cannot ask again nor open the browser's settings, so `canAskAgain`
 * is false), `unavailable` when there is no position in time or no geolocation at all.
 */
export type DeviceLocationResult =
	| { status: 'granted'; coords: { latitude: number; longitude: number } }
	| { status: 'denied'; canAskAgain: boolean }
	| { status: 'unavailable' };

// How long «Κοντά μου» waits for a position once the permission is settled (S-34.3), the application's 10″.
export const DEVICE_LOCATION_TIMEOUT_MS = 10_000;

// The Geolocation API's `PERMISSION_DENIED` code.
const PERMISSION_DENIED = 1;

type PermissionStateOrUnknown = PermissionState | 'unknown';

/** The browser's word on geolocation before asking: `unknown` where the Permissions API cannot say. */
async function readPermission(): Promise<PermissionStateOrUnknown> {
	try {
		const status = await navigator.permissions?.query({ name: 'geolocation' });
		return status?.state ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

/**
 * One read of the position, racing the 10″ of S-34.3 (the application's order: the clock starts once the permission
 * is settled — here at once when it is already granted, else the browser's own `timeout`, which per the
 * Geolocation API counts only after the person answers its prompt). A position after the limit is ignored and the
 * clock is cleared on every outcome.
 */
export async function resolveDeviceLocation(): Promise<DeviceLocationResult> {
	const geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
	if (!geolocation) return { status: 'unavailable' };

	const permission = await readPermission();
	if (permission === 'denied') return { status: 'denied', canAskAgain: false };

	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await new Promise<DeviceLocationResult>((resolve) => {
			if (permission === 'granted') {
				timer = setTimeout(() => resolve({ status: 'unavailable' }), DEVICE_LOCATION_TIMEOUT_MS);
			}
			geolocation.getCurrentPosition(
				(position) =>
					resolve({
						status: 'granted',
						coords: { latitude: position.coords.latitude, longitude: position.coords.longitude }
					}),
				(error) =>
					resolve(
						error.code === PERMISSION_DENIED
							? { status: 'denied', canAskAgain: false }
							: { status: 'unavailable' }
					),
				{ enableHighAccuracy: false, maximumAge: 0, timeout: DEVICE_LOCATION_TIMEOUT_MS }
			);
		});
	} catch {
		return { status: 'unavailable' };
	} finally {
		clearTimeout(timer);
	}
}
