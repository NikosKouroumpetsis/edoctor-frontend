import { browser } from '$app/environment';

// The server's reading reaches the browser one render and one network trip late: a closer difference is noise.
const SERVER_CLOCK_TOLERANCE_MS = 5_000;

let offsetMs = 0;

/**
 * Keeps how far the server's clock stands from this device's (the application's `recordServerDate`, D-118): the
 * web's server writes its «now» into the page it renders, and the browser keeps the difference once it is larger
 * than the tolerance. Only in the browser: the server's own clock is the server's «now».
 */
export function recordServerNow(serverNow: number, receivedAt: number = Date.now()): void {
	if (!browser || !Number.isFinite(serverNow)) return;
	if (Math.abs(serverNow - receivedAt - offsetMs) < SERVER_CLOCK_TOLERANCE_MS) return;
	offsetMs = serverNow - receivedAt;
}

/** The server's «now»: this device's clock moved by the last difference the server showed (the application's). */
export function readServerNow(): number {
	return Date.now() + offsetMs;
}

/** Tests only (the application's seam): forgets the kept difference, so no test depends on another's readings. */
export function resetServerClock(): void {
	offsetMs = 0;
}
