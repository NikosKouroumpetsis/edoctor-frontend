import { resolveMediaUrl } from '$shared/lib/http';

import type { DoctorCard } from '../../types';
import type { DoctorPublicMarketplaceCardView } from './types';

export type CardAdapterContext = {
	pricingVisible: boolean;
	/** Optional preformatted currency function; defaults to a neutral EUR label. */
	formatFee?: (min: number, max: number) => string;
};

function formatAvailabilityLabel(card: DoctorPublicMarketplaceCardView): string {
	const { nextAvailableAt, hasToday, hasNext3Days } = card.availability;

	if (nextAvailableAt) {
		const parsed = new Date(nextAvailableAt);

		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toLocaleString(undefined, {
				weekday: 'short',
				hour: '2-digit',
				minute: '2-digit'
			});
		}
	}

	if (hasToday) {
		return 'Today';
	}

	if (hasNext3Days) {
		return 'Next 3 days';
	}

	return '';
}

function formatCityLabel(card: DoctorPublicMarketplaceCardView): string {
	const office = card.primaryOffice;

	if (!office) {
		return '';
	}

	return [office.city, office.state].filter((part): part is string => Boolean(part)).join(' · ');
}

function formatFeeLabel(
	card: DoctorPublicMarketplaceCardView,
	context: CardAdapterContext
): string {
	if (!context.pricingVisible || !card.priceRange) {
		return '';
	}

	const { min, max } = card.priceRange;

	if (context.formatFee) {
		return context.formatFee(min, max);
	}

	return min === max ? `EUR ${min}` : `EUR ${min}-${max}`;
}

/**
 * Adapts a backend marketplace card to the feature's `DoctorCard`.
 *
 * - `imageUrl` prefers `mediumSizeUrl`, falls back to `smSizeUrl`, then to a placeholder
 *   (relative paths are made absolute) via `resolveMediaUrl`.
 * - `visitFeeLabel` is blank when pricing is not visible (anonymous callers).
 * - `rating` falls back to `0` when the backend rating average is `null`.
 * - category `tags` no longer exist; category scoping happens server-side via the section query.
 */
export function mapCardToDoctor(
	card: DoctorPublicMarketplaceCardView,
	context: CardAdapterContext
): DoctorCard {
	return {
		id: card.doctorId,
		doctorSlug: card.slug,
		name: card.fullName,
		specialty: card.professional?.name ?? '',
		city: formatCityLabel(card),
		imageUrl: resolveMediaUrl(card.primaryImage?.mediumSizeUrl ?? card.primaryImage?.smSizeUrl),
		availabilityLabel: formatAvailabilityLabel(card),
		visitFeeLabel: formatFeeLabel(card, context),
		rating: card.rating.average ?? 0,
		reviewCount: card.rating.count
	};
}
