import type {
	AddressSearchDetailsResponseView,
	AddressSearchSuggestionsResponseView,
	AddressSearchSuggestionView
} from '$shared/lib/api-client';
import { DOCTOR_ONBOARDING_ADDRESS_SUGGESTIONS_MAX } from '$modules/doctor-onboarding/config';
import type {
	DoctorOnboardingAddressDetails,
	DoctorOnboardingAddressSuggestion,
	DoctorOnboardingAddressSuggestions
} from './types';

/** Google's place id as the office's schema takes it (`^[A-Za-z0-9_-]{10,300}$`): anything else is no place. */
const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/u;
/** A UUIDv4, the only token the server mints and takes (D-W3-02). */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
/** The proof's own shape (D-W3-33, the server's `PLACES_POINT_PROOF_PATTERN`), never read, only carried back. */
const POINT_PROOF = /^v1\.[A-Za-z0-9_-]{1,900}\.[0-9a-f]{64}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? value.trim() : null;

/** One suggestion with an id and its main line; the secondary line may be empty. Everything stays text (U-65.6). */
function mapSuggestion(
	value: AddressSearchSuggestionView | null | undefined
): DoctorOnboardingAddressSuggestion[] {
	if (!isRecord(value)) return [];
	const placeId = text(value.placeId);
	const mainText = text(value.mainText);
	if (!placeId || !PLACE_ID.test(placeId) || !mainText) return [];
	return [{ placeId, mainText, secondaryText: text(value.secondaryText) ?? '' }];
}

/**
 * The suggestions as FACTS: at most five, and the token only when it is a UUIDv4. The contract types the answer; nothing
 * checks it on the way in, so it is read as it really came.
 */
export function mapDoctorOnboardingAddressSuggestions(
	view: AddressSearchSuggestionsResponseView | null | undefined
): DoctorOnboardingAddressSuggestions {
	const answer: Partial<AddressSearchSuggestionsResponseView> = isRecord(view) ? view : {};
	const token = text(answer.sessionToken);
	return {
		sessionToken: token && UUID_V4.test(token) ? token : null,
		suggestions: (Array.isArray(answer.suggestions) ? answer.suggestions : [])
			.flatMap(mapSuggestion)
			.slice(0, DOCTOR_ONBOARDING_ADDRESS_SUGGESTIONS_MAX)
	};
}

/** The picked place as FACTS, or `null` without an id or a point a map can draw; a proof of another shape is none. */
export function mapDoctorOnboardingAddressDetails(
	view: AddressSearchDetailsResponseView | null | undefined
): DoctorOnboardingAddressDetails | null {
	if (!isRecord(view)) return null;
	const placeId = text(view.placeId);
	const { latitude, longitude } = view;
	if (
		!placeId ||
		!PLACE_ID.test(placeId) ||
		typeof latitude !== 'number' ||
		typeof longitude !== 'number' ||
		!Number.isFinite(latitude) ||
		!Number.isFinite(longitude)
	) {
		return null;
	}
	const proof = typeof view.pointProof === 'string' ? view.pointProof : null;
	return {
		placeId,
		streetLine: text(view.streetLine) ?? '',
		postalCode: text(view.postalCode),
		city: text(view.city),
		latitude,
		longitude,
		pointProof: proof && POINT_PROOF.test(proof) ? proof : null
	};
}
