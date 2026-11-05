/**
 * The FAQ anchors other pages link to (U-60.1; the CMS page `faq` gives every topic and question its `{#anchor}`):
 * the footer's «Πώς κλείνω ραντεβού» (`#booking`, a topic) and «Ακύρωση ραντεβού» (`#cancellation`, a question), and
 * the deletion page's question (U-62.1 Π5), and «Πώς λειτουργούν οι κριτικές» (U-67.1: a question of the mock's FAQ,
 * U-67.3: the production text carries the same anchor).
 */
export const faqAnchors = {
	booking: 'booking',
	cancellation: 'cancellation',
	deleteAccount: 'delete-account',
	reviews: 'what-are-reviews'
} as const;

/** The CMS page the help centre reads. */
export const FAQ_PAGE_SLUG = 'faq';

/** At most this many «Δημοφιλείς ερωτήσεις» (U-60.1: six, marked in the CMS) and suggestions (the prototype's five). */
export const FAQ_POPULAR_LIMIT = 6;
export const FAQ_SUGGESTION_LIMIT = 5;

/** Below 744 the field filters the questions as it is typed, after this much quiet (the application's 250 ms). */
export const FAQ_FILTER_DEBOUNCE_MS = 250;
