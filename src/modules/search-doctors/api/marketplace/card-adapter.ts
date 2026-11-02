import { toStarScore } from '$shared/lib/rating-stars';
import { resolveMediaUrl } from '$shared/lib/http';
import { readServerNow } from '$shared/lib/server-clock';

import type {
	DoctorPublicMarketplaceCardView,
	SearchDoctorsCardFacts,
	SearchDoctorsCardPoint
} from './types';

export type CardAdapterContext = {
	pricingVisible: boolean;
	/** «Now» the card is read at; the server's «now» by default (D-118: never the device's clock alone). */
	now?: number;
};

/** The visit price only when it is a finite number (the application's `buildPrimaryServicePrice`), else none. */
function buildPrimaryServicePrice(price: unknown): number | null {
	return typeof price === 'number' && Number.isFinite(price) ? price : null;
}

const isCoordinate = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);

/** The office's point for the results map (U-24.4, §7.1): none without both coordinates. */
function buildPoint(card: DoctorPublicMarketplaceCardView): SearchDoctorsCardPoint | null {
	const office = card.primaryOffice;
	return office && isCoordinate(office.latitude) && isCoordinate(office.longitude)
		? { latitude: office.latitude, longitude: office.longitude }
		: null;
}

/**
 * 🔴 U-32.1: a backend marketplace card as FACTS (the application's `mapCardToFacts`), no words and no display format
 * — the home's and the results' cards are `lib/doctor-card`'s (`buildDoctorCard`, `buildSearchResultCard`):
 *
 * - `imageUrl` prefers `mediumSizeUrl`, then `smSizeUrl`, as an absolute address; none (or blank) is `null`;
 * - `office` and `availability` as the server sends them; `point` only with both coordinates (§7.1);
 * - `rating` the average (`0` when the server sends none), `reviewCount` the number of reviews (S-31.1);
 * - `primaryServicePrice` only a finite number, with the page's pricing gate;
 * - `readAt` the server's «now» the card was read at (D-118): its day words are told against it;
 * - 🔴 U-45.2: `badgeId: 'patient-favorite'` only for `isPatientsChoice === true` (the backend's verdict, always on
 *   the wire, optional in the contract);
 * - 🔴 U-49: `rating` only on the 5 stars (`toStarScore`): a value of the old 1–10 scale is none (`0`).
 */
export function mapCardToFacts(
	card: DoctorPublicMarketplaceCardView,
	context: CardAdapterContext
): SearchDoctorsCardFacts {
	const photo = card.primaryImage?.mediumSizeUrl?.trim() || card.primaryImage?.smSizeUrl?.trim();
	const office = card.primaryOffice;

	return {
		id: card.doctorId,
		doctorSlug: card.slug,
		name: card.fullName,
		professionalName: card.professional?.name ?? '',
		imageUrl: photo ? resolveMediaUrl(photo) : null,
		office: office
			? {
					city: office.city,
					street: office.street,
					streetNumber: office.streetNumber,
					distanceKm: office.distanceKm
				}
			: null,
		point: buildPoint(card),
		description: card.descriptionExcerpt ?? null,
		availability: {
			nextAvailableAt: card.availability.nextAvailableAt,
			hasToday: card.availability.hasToday,
			hasNext3Days: card.availability.hasNext3Days
		},
		rating: toStarScore(card.rating.average) ?? 0,
		reviewCount: card.rating.count,
		pricingVisible: context.pricingVisible,
		primaryServicePrice: buildPrimaryServicePrice(card.primaryServicePrice),
		readAt: context.now ?? readServerNow(),
		...(card.isPatientsChoice === true ? { badgeId: 'patient-favorite' as const } : {})
	};
}
