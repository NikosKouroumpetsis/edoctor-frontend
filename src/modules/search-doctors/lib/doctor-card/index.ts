import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { formatDecimal, formatEuro, zonedDay } from '$shared/lib/format';
import { formatInstantDayTime } from '$shared/lib/format-day-time';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	SearchDoctorsCardBadgeId,
	SearchDoctorsCardFacts
} from '$modules/search-doctors/api/marketplace/types';
import type { DoctorCard, DoctorCardFee, SearchResultCard } from '$modules/search-doctors/types';

export type DoctorCardAvailability = {
	nextAvailableAt: string | null;
	hasToday: boolean;
	hasNext3Days: boolean;
};

// 🔴 S-32.9: the ONE day-and-time phrase is the shared `formatInstantDayTime` since wave 1.5 (the profile speaks it
// too); re-exported here for the card's own guards.
export { formatInstantDayTime };

/**
 * The card's availability (the application's `formatAvailabilityLabel`): the next slot when it is on or after the
 * platform's today, else «Σήμερα» / «Επόμενες 3 ημέρες» from the flags, else nothing.
 */
export function formatAvailabilityLabel(
	availability: DoctorCardAvailability,
	now: number,
	locale: SupportedLocale
): string {
	const next = availability.nextAvailableAt ? Date.parse(availability.nextAvailableAt) : Number.NaN;
	if (
		!Number.isNaN(next) &&
		zonedDay(next, PLATFORM_TIME_ZONE) >= zonedDay(now, PLATFORM_TIME_ZONE)
	) {
		const label = formatInstantDayTime(next, now, locale);
		if (label) return label;
	}
	if (availability.hasToday) return m.card_available_today({}, { locale });
	if (availability.hasNext3Days) return m.card_available_next_3_days({}, { locale });
	return '';
}

/**
 * The price line (the application's `buildFee`): hidden pricing ⇒ the sign-in words; visible without a simple
 * visit price ⇒ «on request»; else «Από 60 €», the one price a booking starts at.
 */
export function buildFee(
	primaryServicePrice: number | null | undefined,
	pricingVisible: boolean,
	locale: SupportedLocale
): DoctorCardFee {
	if (!pricingVisible) return { kind: 'login', label: m.card_login_for_fee({}, { locale }) };
	if (primaryServicePrice == null) {
		return { kind: 'on-request', label: m.card_fee_on_request({}, { locale }) };
	}
	return {
		kind: 'amount',
		label: m.card_fee_from({ amount: formatEuro(primaryServicePrice, locale) }, { locale })
	};
}

/** The office facts of a results card (the application's `SearchDoctorsCardOfficeFacts`). */
export type DoctorCardOffice = {
	city?: string | null;
	street?: string | null;
	streetNumber?: string | null;
	distanceKm?: number | null;
};

// A measured distance under 100 m still reads «0,1 χλμ» (the application's `MIN_SHOWN_DISTANCE_KM`).
const MIN_SHOWN_DISTANCE_KM = 0.1;

/**
 * «0,6 χλμ» — the office's distance from the searched point, only when the server measured one (a «Κοντά μου»
 * search, S-31.3), at most one decimal, never under 0,1; the number and its unit never part (a no-break space).
 */
export function formatDistanceLabel(
	distanceKm: number | null | undefined,
	locale: SupportedLocale
): string {
	if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) return '';
	const distance = formatDecimal(Math.max(distanceKm, MIN_SHOWN_DISTANCE_KM), locale, 1, 0);
	return m.results_distance({ distance }, { locale });
}

/**
 * 🔴 U-24.1: the results card's full address, «Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι», and with «Κοντά μου» the
 * distance after it — «… · 0,6 χλμ» (the approved card, §7.4; the application's line led with the distance). A street
 * without a number, or no street, degrades to what there is; no office is an empty line.
 */
export function formatAddressLabel(
	office: DoctorCardOffice | null | undefined,
	locale: SupportedLocale
): string {
	if (!office) return '';
	const street = [office.street, office.streetNumber]
		.filter((part): part is string => Boolean(part?.trim()))
		.join(' ');
	const address = [street, office.city?.trim()]
		.filter((part): part is string => Boolean(part))
		.join(', ');
	return [address, formatDistanceLabel(office.distanceKm, locale)]
		.filter((part) => Boolean(part))
		.join(' · ');
}

/**
 * «184», the number of reviews beside the score, or `null` for a doctor nobody has reviewed (S-31.1: «★ Νέο» alone,
 * the application's `reviewCountLabel`).
 */
export function formatReviewCountLabel(count: number, locale: SupportedLocale): string | null {
	if (!Number.isFinite(count) || count <= 0) return null;
	return formatDecimal(count, locale, 0);
}

/**
 * «4,9», or «Νέο» for a doctor without reviews (S-31.1: a «0,0» reads as a bad score) — the application's rule: the
 * count decides, a missing average with reviews reads 0 (its adapter's `average ?? 0`).
 */
export function formatRatingLabel(
	average: number | null,
	count: number,
	locale: SupportedLocale
): string {
	if (!Number.isFinite(count) || count <= 0) return m.card_new({}, { locale });
	return formatDecimal(average ?? 0, locale, 1);
}

const toLocale = (lang: string): SupportedLocale => (lang === 'en' ? 'en' : 'el');

const BADGE_LABELS = {
	'patient-favorite': m.card_badge_patient_favorite
} as const satisfies Record<SearchDoctorsCardBadgeId, unknown>;

/** 🔴 U-45.2 (the application's `formatBadgeLabel`): the badge's words, or none without a badge. */
export function formatBadgeLabel(
	badgeId: SearchDoctorsCardBadgeId | undefined,
	locale: SupportedLocale
): string | undefined {
	return badgeId ? BADGE_LABELS[badgeId]({}, { locale }) : undefined;
}

/**
 * 🔴 U-32.1: the home's card (U-20) from a card's facts (`api/` gives facts, the application's model), every line in
 * the page's language: «Ειδικότητα · Περιοχή» (the office's city), the day and time on the card's `readAt` (S-32.9,
 * D-118), the application's fee (the sign-in words while pricing is hidden), «Νέο» without reviews (S-31.1);
 * 🔴 U-45.2: «Επιλογή ασθενών» only for a doctor the backend marks.
 */
export function buildDoctorCard(card: SearchDoctorsCardFacts, lang: string): DoctorCard {
	const locale = toLocale(lang);
	const badgeLabel = formatBadgeLabel(card.badgeId, locale);
	return {
		id: card.id,
		doctorSlug: card.doctorSlug,
		name: card.name,
		specialty: card.professionalName,
		area: card.office?.city ?? '',
		imageUrl: card.imageUrl,
		availabilityLabel: formatAvailabilityLabel(card.availability, card.readAt, locale),
		fee: buildFee(card.primaryServicePrice, card.pricingVisible, locale),
		ratingLabel: formatRatingLabel(card.rating, card.reviewCount, locale),
		...(badgeLabel ? { badgeLabel } : {})
	};
}

/**
 * A results card (U-24.1) from the same facts: the home's card plus the application's list lines — the description
 * (a blank one is none), the full address with the distance the server measured (S-31.3), the number of reviews —
 * and the map's facts from the SAME card: the office's point and the pin's price («60 €» only while the price shows;
 * else the dot, §7.1).
 */
export function buildSearchResultCard(
	card: SearchDoctorsCardFacts,
	lang: string
): SearchResultCard {
	const locale = toLocale(lang);
	const price = card.primaryServicePrice;
	return {
		...buildDoctorCard(card, lang),
		description: card.description?.trim() || null,
		address: formatAddressLabel(card.office, locale),
		reviewCountLabel: formatReviewCountLabel(card.reviewCount, locale),
		point: card.point,
		pinLabel: card.pricingVisible && price !== null ? formatEuro(price, locale) : null
	};
}

/**
 * 🔴 U-34.4 (app = web): the page's cards with a member's fees laid over them, by doctor: only the fee's words and the
 * pin's price change, so nothing on the page moves, and a card the member's read did not bring, or brought hidden, stays
 * as it is.
 */
export function overlayMemberFees<Card extends DoctorCard & { pinLabel?: string | null }>(
	cards: readonly Card[],
	member: readonly (DoctorCard & { pinLabel?: string | null })[] | undefined
): Card[] {
	if (!member) return [...cards];
	const byId = new Map(member.map((card) => [card.id, card]));
	return cards.map((card) => {
		const own = byId.get(card.id);
		if (!own || own.fee.kind === 'login') return card;
		return {
			...card,
			fee: own.fee,
			...('pinLabel' in card && own.pinLabel !== undefined ? { pinLabel: own.pinLabel } : {})
		};
	});
}
