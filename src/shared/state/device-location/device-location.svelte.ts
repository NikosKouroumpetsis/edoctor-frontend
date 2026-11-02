import { browser } from '$app/environment';

/** A device's position: the latitude and longitude alone (nothing else of a reading is kept). */
export type DeviceCoordinates = { latitude: number; longitude: number };

/**
 * 🔴 S-07.3 rule 11 on the web (the owner's rule, the orchestrator's decision of 29/10): the coordinates never go into
 * the results address — a link is shared, kept in the history and reaches the server. The position «Κοντά μου» just
 * read lives ONLY in this tab's memory, for the results page of the same visit: no storage, no cookie, never on the
 * server (written only in the browser), gone with a reload. Without it, the results page asks the device again
 * (the receiver's own position). The application keeps it in its store; its route params are not links.
 * U-29.1: runes state, so it lives here (`shared/state`), read by the search and the results; never in a `lib/`.
 */
let remembered = $state.raw<DeviceCoordinates | null>(null);

/** Keeps the position just read (the application's `setDeviceLocation`): the latitude and longitude alone. */
export function rememberDeviceLocation(coords: DeviceCoordinates): void {
	if (!browser) return;
	remembered = { latitude: coords.latitude, longitude: coords.longitude };
}

/** The position read in this visit, or `null` (a reload, a shared link, the server): then ask the device again. */
export function readFreshDeviceLocation(): DeviceCoordinates | null {
	return remembered;
}

/** Forgets it (tests, and a page that wants a new reading). */
export function forgetDeviceLocation(): void {
	remembered = null;
}
