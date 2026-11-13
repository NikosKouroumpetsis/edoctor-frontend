import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DeletionChannel } from '$modules/account/api/deletion';
import type { AccountDeletion } from './hooks/use-deletion.svelte';

/** The two steps of «Διαγραφή λογαριασμού» (D-W45-30): what the deletion does, then the code that carries it out. */
export type DeletionFlowStep = 'review' | 'code';

/** What the preview's read shows: still asking, no answer to show, or the answer. */
export type DeletionReviewView = 'loading' | 'failed' | 'ready';

/**
 * 🔴 U-65.6: the hand-off between the two steps, in the page's MEMORY only — where the code went (the server's mask or
 * its channel) and when; never an address, a storage or a log. A reload forgets it, and the code step goes back to step 1.
 */
export type DeletionPendingCode = {
	channel: DeletionChannel;
	destinationMasked: string | null;
	/** Reached through a throttled send: a code is ALREADY out there, none was just posted. */
	recent: boolean;
	issuedAt: number;
};

/** What the «Αποστολή ξανά» line says back: a wait (refused) or a new code (sent). */
export type DeletionResendFeedback = { kind: 'wait' | 'sent'; message: string };

export type DeletionFlowProps = {
	locale: SupportedLocale;
	step: DeletionFlowStep;
	/** The flow's one state, made by the screen (`useAccountDeletion`) so both steps and the end share it. */
	flow: AccountDeletion;
	/** The Privacy policy, resolved by the screen in the page's language (a module knows no route). */
	policyHref: string;
};

export type DeletionDoneProps = {
	locale: SupportedLocale;
	/** Where the confirmation goes (the server's mask or its channel's words), `null` when unknown. */
	destination: string | null;
	/** The home page, in the page's language. */
	homeHref: string;
};
