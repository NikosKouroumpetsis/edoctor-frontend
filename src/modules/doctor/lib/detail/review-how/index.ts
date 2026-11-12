import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** One section of «Πώς λειτουργούν οι κριτικές»: its small title over its words (the info window's block). */
export type DoctorReviewHowBlock = { heading: string; text: string };

/** One way on under the words: the Help Centre's answer, or the review policy (the caller's addresses). */
export type DoctorReviewHowLink = { id: 'help' | 'policy'; label: string; href: string };

/**
 * 🔴 U-67.1 (screen 12) · D-W4-24: the words of «Πώς λειτουργούν οι κριτικές» — who writes a review, how it is checked,
 * how the score is made, the order, «Επιλογή ασθενών» — in ONE place, read by the profile's reviews window and by the
 * rating form of screen 54 (the same window, information and not an action). Moved from `window-reviews.svelte`.
 */
export function buildDoctorReviewHowBlocks(locale: SupportedLocale): DoctorReviewHowBlock[] {
	const options = { locale };
	return [
		{
			heading: m.doctor_reviews_how_who_title({}, options),
			text: m.doctor_reviews_how_who_body({}, options)
		},
		{
			heading: m.doctor_reviews_how_check_title({}, options),
			text: m.doctor_reviews_how_check_body({}, options)
		},
		{
			heading: m.doctor_reviews_how_score_title({}, options),
			text: m.doctor_reviews_how_score_body({}, options)
		},
		{
			heading: m.doctor_reviews_how_order_title({}, options),
			text: m.doctor_reviews_how_order_body({}, options)
		},
		{
			heading: m.doctor_reviews_how_choice_title({}, options),
			text: m.doctor_reviews_how_choice_body({}, options)
		}
	];
}

/** The window's two ways on (U-69.2): the Help Centre's answer and the review policy, at the caller's addresses. */
export function buildDoctorReviewHowLinks(
	locale: SupportedLocale,
	links: { helpHref: string; policyHref: string }
): DoctorReviewHowLink[] {
	const options = { locale };
	return [
		{ id: 'help', label: m.doctor_reviews_how_help({}, options), href: links.helpHref },
		{ id: 'policy', label: m.doctor_reviews_how_policy({}, options), href: links.policyHref }
	];
}
