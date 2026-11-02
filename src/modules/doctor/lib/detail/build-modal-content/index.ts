import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorProfile, DoctorReviewSnippet } from '$modules/doctor/api/profile';
import { buildReviewCard } from '../build-content';
import {
	reviewChipScoreLabel,
	reviewChipTitle,
	reviewCountLabel,
	reviewScoreLabel
} from '../labels';
import { buildPricedServices } from '../priced-services';
import { buildDoctorReviewRatingDistribution } from '../review-rating-distribution';
import { buildDoctorReviewSortOptions } from '../review-sorting';
import type { DoctorDetailServiceCost, DoctorReviewsModalContent } from '../types';

/** The window «Κόστος υπηρεσιών»: EVERY service (the section shows three), the same fee rule. */
export function buildDoctorServicesModalContent(
	doctor: DoctorProfile,
	locale: SupportedLocale
): DoctorDetailServiceCost | null {
	const services = doctor.services ?? [];
	if (services.length === 0) return null;
	return {
		title: m.doctor_section_service_cost({}, { locale }),
		notice: m.doctor_service_cost_notice({}, { locale }),
		costLabel: m.doctor_service_cost_label({}, { locale }),
		includesLabel: m.doctor_service_includes_label({}, { locale }),
		descriptionLabel: m.doctor_service_description_label({}, { locale }),
		services: buildPricedServices(services, doctor.pricingVisible, locale),
		hasMore: false
	};
}

/**
 * The reviews window (the application's `buildDoctorReviewsModalContent`): every review, the score over the
 * badge's explanation (only for a rated doctor), the spread 5…1 from the list itself, the aspects and the four
 * orders. `null` for no review (`[]`) or a doctor nobody may see (`null`). «Πώς λειτουργούν» stays hidden (U-35.7).
 */
export function buildDoctorReviewsModalContent({
	doctor,
	reviews,
	locale
}: {
	doctor: DoctorProfile;
	reviews: DoctorReviewSnippet[] | null | undefined;
	locale: SupportedLocale;
}): DoctorReviewsModalContent | null {
	if (!reviews || reviews.length === 0) return null;
	const cards = reviews.map((review) => buildReviewCard(review, locale));
	const score = doctor.reviewSummary?.score ?? doctor.rating;
	const count = doctor.reviewSummary?.count ?? doctor.reviewCount;
	return {
		title: m.doctor_section_reviews({}, { locale }),
		...(Number.isFinite(score) && score > 0
			? {
					header: {
						scoreLabel: reviewScoreLabel(score, locale),
						// 🔴 U-45.2: «Επιλογή ασθενών» and its explanation only when the backend says so.
						...(doctor.isPatientsChoice === true
							? {
									badgeTitle: m.doctor_patient_choice({}, { locale }),
									description: m.doctor_reviews_patient_choice_description({}, { locale })
								}
							: {}),
						countLabel: reviewCountLabel(count, locale)
					}
				}
			: {}),
		// Counted from the list the window shows: every approved review, never a separate aggregate.
		countLabel: reviewCountLabel(cards.length, locale),
		ratings: {
			title: m.doctor_reviews_overall({}, { locale }),
			categoriesLabel: m.doctor_reviews_categories({}, { locale }),
			buckets: buildDoctorReviewRatingDistribution(cards),
			chips: (doctor.reviewChips ?? []).map((chip) => ({
				id: chip.id,
				title: reviewChipTitle(chip.id, locale),
				score: reviewChipScoreLabel(chip.score, locale)
			}))
		},
		sortLabel: m.doctor_reviews_sort_label({}, { locale }),
		sortOptions: buildDoctorReviewSortOptions(locale),
		cards
	};
}
