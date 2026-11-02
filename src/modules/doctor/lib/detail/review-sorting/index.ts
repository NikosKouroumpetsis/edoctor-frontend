import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorDetailReviewCardContent,
	DoctorDetailReviewSortOption,
	DoctorReviewSortId
} from '../types';

const SORT_LABELS = {
	newest: m.doctor_reviews_sort_newest,
	oldest: m.doctor_reviews_sort_oldest,
	'rating-high': m.doctor_reviews_sort_highest,
	'rating-low': m.doctor_reviews_sort_lowest
} as const satisfies Record<DoctorReviewSortId, unknown>;

const SORT_IDS = ['newest', 'oldest', 'rating-high', 'rating-low'] as const;

/** The order the list opens in: the backend's own, newest first (the application's). */
export const DEFAULT_DOCTOR_REVIEW_SORT_ID: DoctorReviewSortId = 'newest';

export function buildDoctorReviewSortOptions(
	locale: SupportedLocale
): DoctorDetailReviewSortOption[] {
	return SORT_IDS.map((id) => ({ id, label: SORT_LABELS[id]({}, { locale }) }));
}

/** Whether a value is one of the sort ids (a `<select>` answers a string). */
export function isDoctorReviewSortId(value: string): value is DoctorReviewSortId {
	return (SORT_IDS as readonly string[]).includes(value);
}

const timeOf = (card: DoctorDetailReviewCardContent) => {
	const time = Date.parse(card.publishedAt);
	return Number.isNaN(time) ? 0 : time;
};
const ratingOf = (card: DoctorDetailReviewCardContent) =>
	Number.isFinite(card.rating) ? card.rating : 0;

const comparators: Record<
	DoctorReviewSortId,
	(a: DoctorDetailReviewCardContent, b: DoctorDetailReviewCardContent) => number
> = {
	newest: (a, b) => timeOf(b) - timeOf(a),
	oldest: (a, b) => timeOf(a) - timeOf(b),
	'rating-high': (a, b) => ratingOf(b) - ratingOf(a) || timeOf(b) - timeOf(a),
	'rating-low': (a, b) => ratingOf(a) - ratingOf(b) || timeOf(b) - timeOf(a)
};

/** The window's cards in an order (a NEW array; ties keep the backend's order: a stable sort). */
export function sortDoctorReviewCards(
	cards: DoctorDetailReviewCardContent[],
	sortId: DoctorReviewSortId
): DoctorDetailReviewCardContent[] {
	return [...cards].sort(comparators[sortId]);
}
