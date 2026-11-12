import type { ApiResponseData } from '$shared/lib/api-client';
import {
	httpSessionDelete,
	httpSessionGet,
	httpSessionPatch,
	httpSessionPost
} from '$shared/lib/http';
import { mapBookingRelative, type BookingRelativeFacts } from '$modules/appointments/api/patient';
import { mapRelative } from './map';
import type {
	BookingRelativeCreated,
	BookingRelativeInput,
	RelativeFacts,
	RelativeUpdate
} from './types';

const relativesOf = (patientId: string) => `/patient/${encodeURIComponent(patientId)}/relatives`;
const relativeOf = (patientId: string, relativeId: string) =>
	`${relativesOf(patientId)}/${encodeURIComponent(relativeId)}`;

/**
 * A new relative of the person (`POST /patient/{patientId}/relatives`, `201`), with the cookies, as the booking names it:
 * an id and both names, `null` for an answer that is none (review w3-w6 R1 MINOR-1: the relative's ΑΜΚΑ, ΑΦΜ, mobile
 * and email the server answers with never leave `api/`).
 */
export async function createBookingRelative(
	patientId: string,
	input: BookingRelativeInput
): Promise<BookingRelativeFacts | null> {
	const view = await httpSessionPost<BookingRelativeCreated>(relativesOf(patientId), {
		body: input
	});
	return mapBookingRelative(view)[0] ?? null;
}

/** Screen 55: every relative of the person, whole for the form (`[]` for an answer that is no list). */
export async function listRelatives(
	patientId: string,
	signal?: AbortSignal
): Promise<RelativeFacts[]> {
	const view = await httpSessionGet<ApiResponseData<'listPatientRelatives', 200>>(
		relativesOf(patientId),
		{ signal }
	);
	return (Array.isArray(view) ? view : []).flatMap((entry) => {
		const facts = mapRelative(entry);
		return facts ? [facts] : [];
	});
}

/** Screen 55's change (the `relatives-write` rate class): the relative as the server keeps it now, `null` for none. */
export async function updateRelative(
	patientId: string,
	relativeId: string,
	update: RelativeUpdate
): Promise<RelativeFacts | null> {
	return mapRelative(
		await httpSessionPatch<ApiResponseData<'updatePatientRelative', 200>>(
			relativeOf(patientId, relativeId),
			{ body: update }
		)
	);
}

/**
 * Screen 55's deletion (U-139.4: always allowed; the booked appointments keep their snapshot): the server's copy of
 * the deleted relative never leaves `api/`.
 */
export async function deleteRelative(patientId: string, relativeId: string): Promise<void> {
	await httpSessionDelete<ApiResponseData<'deletePatientRelative', 200>>(
		relativeOf(patientId, relativeId)
	);
}
