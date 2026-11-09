import { httpSessionPost } from '$shared/lib/http';
import { mapBookingRelative, type BookingRelativeFacts } from '$modules/appointments/api/patient';
import type { BookingRelativeCreated, BookingRelativeInput } from './types';

/**
 * A new relative of the person (`POST /patient/{patientId}/relatives`, `201`), with the cookies, as the booking names it:
 * an id and both names, `null` for an answer that is none (review w3-w6 R1 MINOR-1: the relative's ΑΜΚΑ, ΑΦΜ, mobile
 * and email the server answers with never leave `api/`).
 */
export async function createBookingRelative(
	patientId: string,
	input: BookingRelativeInput
): Promise<BookingRelativeFacts | null> {
	const view = await httpSessionPost<BookingRelativeCreated>(
		`/patient/${encodeURIComponent(patientId)}/relatives`,
		{ body: input }
	);
	return mapBookingRelative(view)[0] ?? null;
}
