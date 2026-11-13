import type { PatientSelfResponseView, RelativeScopedView } from '$shared/lib/api-client';
import type { BookingPatientFacts, BookingRelativeFacts } from './types';

/**
 * A name part (or an id), or `null`: blank and whitespace read as absence (a name saved as a space is no name), and so
 * does what is no text at all (W-4: a broken answer never throws).
 */
const toName = (value: unknown): string | null =>
	typeof value === 'string' ? value.trim() || null : null;

/**
 * A relative the booking can name: an id and both names, else nothing (the summary never prints half a person); its
 * relationship and gender as spelled, `''` when none (U-139.5: the words are `lib/`'s).
 */
export function mapBookingRelative(
	view: RelativeScopedView | null | undefined
): BookingRelativeFacts[] {
	const relativeId = toName(view?.id);
	const firstName = toName(view?.firstName);
	const lastName = toName(view?.lastName);
	if (!relativeId || !firstName || !lastName) return [];
	return [
		{
			relativeId,
			firstName,
			lastName,
			relationship: toName(view?.relationship) ?? '',
			gender: toName(view?.gender) ?? ''
		}
	];
}

/**
 * `GET /patient/me` as FACTS: `null` for a session without a patient profile (a doctor's account), else the id, the
 * name, the phone's state and mask, the relatives. The mask is kept only when it looks like one (U-65.6, D-47).
 */
export function mapBookingPatient(view: PatientSelfResponseView): BookingPatientFacts | null {
	const patientId = toName(view?.id);
	if (!view || !patientId) return null;
	const masked = toName(view.loginPhoneMasked);
	return {
		patientId,
		firstName: toName(view.firstName),
		lastName: toName(view.lastName),
		phoneVerified: view.loginPhoneVerified === true,
		phoneMasked: masked && masked.includes('•') ? masked : null,
		relatives: (Array.isArray(view.relatives) ? view.relatives : []).flatMap(mapBookingRelative)
	};
}
