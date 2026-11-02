/**
 * 🔴 U-49 (the backend's `RATING_STARS_MAX`): every score the public sees is on 5 stars — a review's overall and its
 * aspects, a doctor's average on the profile and the cards, the aspects' averages. The backend stores 1–10 and
 * answers ÷ 2; the clients show the value as it comes.
 */
export const RATING_STARS_MAX = 5;

/**
 * A score as the page may show it: a finite number in 0…5, else `null` — a value of the old 1–10 scale (a backend
 * before U-49) never reaches the page, neither clamped nor halved.
 */
export function toStarScore(value: number | null | undefined): number | null {
	return typeof value === 'number' &&
		Number.isFinite(value) &&
		value >= 0 &&
		value <= RATING_STARS_MAX
		? value
		: null;
}
