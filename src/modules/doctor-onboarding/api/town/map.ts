import type { DoctorPublicMarketplaceLocationSuggestionsResponseView } from '$shared/lib/api-client';
import type { DoctorOnboardingTownPoint } from './types';

const inGreece = (latitude: number, longitude: number) =>
	latitude >= 34 && latitude <= 42 && longitude >= 19 && longitude <= 30;

/** The first item's point, or `null` without one (or with one no map of Greece would show), read as it really came. */
export function mapDoctorOnboardingTown(
	view: DoctorPublicMarketplaceLocationSuggestionsResponseView | null | undefined
): DoctorOnboardingTownPoint | null {
	const items: unknown = view?.items;
	const first = Array.isArray(items)
		? (items[0] as Partial<Record<'latitude' | 'longitude', unknown>> | null | undefined)
		: undefined;
	const latitude = first?.latitude;
	const longitude = first?.longitude;
	return typeof latitude === 'number' &&
		typeof longitude === 'number' &&
		Number.isFinite(latitude) &&
		Number.isFinite(longitude) &&
		inGreece(latitude, longitude)
		? { latitude, longitude }
		: null;
}
