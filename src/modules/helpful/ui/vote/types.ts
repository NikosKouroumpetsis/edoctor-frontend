import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { HelpfulFeedbackSize } from '$shared/ui/molecules/helpful-feedback';

/** One «Ήταν χρήσιμο;» (wave 2, screen 23, U-78). */
export type HelpfulVoteProps = {
	/** What it is about: `article:<slug>` or `faq:<anchor>` (`lib/vote`). */
	target: string;
	size?: HelpfulFeedbackSize;
	locale: SupportedLocale;
	testId?: string;
};
