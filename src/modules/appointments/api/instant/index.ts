// A whole ISO-8601 instant: the day, `T`, the hour and the minute (seconds and their fraction when written), and the
// zone — `Z` or an offset. Nothing shorter is a moment.
const ISO_INSTANT =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/u;

/**
 * 🔴 D-118 · review w4-w6 R1 MINOR-1: an instant of the server as its text, or none — the ONE reader of the module's
 * mappers (the appointment's, the rating's). Only a whole ISO instant WITH its zone is a moment: a day alone would be
 * read as midnight UTC, a local hour by the device's zone, anything else by the engine's own rules — each a moment the
 * server never said, written to the patient as a deadline. Safe, never made up, never a throw.
 */
export function readInstant(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const read = value.trim();
	return ISO_INSTANT.test(read) && Number.isFinite(Date.parse(read)) ? read : null;
}
