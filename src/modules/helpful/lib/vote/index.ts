import { browser } from '$app/environment';
import { helpfulStorageKey } from '$shared/config/env';

/** A device's answer on one article or question: «up», «down» with an optional reason, or none. */
export type HelpfulChoice = 'up' | 'down';
export type HelpfulReasonId = 'not-answered' | 'unclear' | 'outdated';
export type HelpfulAnswer = { value: HelpfulChoice | null; reason: HelpfulReasonId | null };

export const HELPFUL_NO_ANSWER: HelpfulAnswer = { value: null, reason: null };

/** The three reasons of a «down» (U-78.1 Ε1): a closed list, never free text (U-65.6). */
export const helpfulReasonIds: readonly HelpfulReasonId[] = ['not-answered', 'unclear', 'outdated'];

const FAQ_ANCHOR = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const FAQ_ANCHOR_MAX = 80;
const VOTER_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** U-78: what a vote is about: an article by its slug. */
export const helpfulArticleTarget = (slug: string) => `article:${slug}`;

/** U-78: a question of the FAQ by its anchor; `null` for an id the server's grammar would refuse (no widget there). */
export function helpfulFaqTarget(anchor: string): string | null {
	return anchor.length <= FAQ_ANCHOR_MAX && FAQ_ANCHOR.test(anchor) ? `faq:${anchor}` : null;
}

/**
 * The press of a thumb (U-78, app = web): the one chosen goes back to no answer, the other one changes it; a reason goes
 * with «down» alone, so «up» or taking it back forgets it.
 */
export function nextHelpfulAnswer(current: HelpfulAnswer, pressed: HelpfulChoice): HelpfulAnswer {
	if (current.value === pressed) return HELPFUL_NO_ANSWER;
	return { value: pressed, reason: null };
}

/** The press of a reason: only after «down»; the one chosen goes back to none. */
export function nextHelpfulReason(current: HelpfulAnswer, pressed: HelpfulReasonId): HelpfulAnswer {
	if (current.value !== 'down') return current;
	return { value: 'down', reason: current.reason === pressed ? null : pressed };
}

/**
 * The device's key (U-78.1 Ε2): a random UUID the server gave at the first vote, kept here and sent in a header, never in
 * an address; no name, no account. Only what has its shape comes out of the storage (U-65.6).
 */
export function readHelpfulVoterKey(): string | null {
	if (!browser) return null;
	try {
		const stored = window.localStorage.getItem(helpfulStorageKey);
		return stored && VOTER_KEY.test(stored) ? stored : null;
	} catch {
		return null;
	}
}

/** Keeps the key the server just gave; a browser that blocks storage simply votes as a new device next time. */
export function writeHelpfulVoterKey(key: string) {
	if (!browser || !VOTER_KEY.test(key)) return;
	try {
		window.localStorage.setItem(helpfulStorageKey, key);
	} catch {
		return;
	}
}
