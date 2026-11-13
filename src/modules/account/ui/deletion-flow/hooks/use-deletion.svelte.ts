import { untrack } from 'svelte';
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import {
	confirmDeletion,
	deletionPreviewQuery,
	readDeletionFailure,
	startDeletion
} from '$modules/account/api/deletion';
import {
	buildDeletionPreview,
	cleanDeletionCode,
	DELETION_CODE_LENGTH,
	deletionDestination,
	deletionFailureMessage,
	deletionResendWait
} from '$modules/account/lib/deletion-flow';
import type { DeletionPendingCode, DeletionResendFeedback, DeletionReviewView } from '../types';

// The server spaces two sends by a minute and keeps a code for ten; it ends its deletion within 60″, so a confirm
// unanswered after 90″ never will be (the application's numbers).
const RESEND_COOLDOWN_MS = 60_000;
const CODE_LIFETIME_MS = 10 * 60_000;
const CONFIRM_ANSWER_LIMIT_MS = 90_000;

/**
 * 🔴 D-W45-30 (wave 4.5, screen 62, U-173 Ε1 Α): «Διαγραφή λογαριασμού» on the web — the application's flow, step for
 * step (`use-screen` of its two screens). ONE state for both steps and the end, made by the screen: the preview (read
 * for a member only, asked again each time), the code's hand-off in memory (🔴 U-65.6: never an address or a storage),
 * and the three writes — each press ONE request. A failed or UNANSWERED confirm never ends the session by itself: after
 * one, the session gate's refusal IS the deletion. Done ⇒ the browser's session is closed and nothing of the person stays.
 */
export function useAccountDeletion(options: {
	/** The address is one of the deletion's two. */
	active: () => boolean;
	locale: () => SupportedLocale;
	/** A code is out: the screen opens the code step. */
	onCodeSent: () => void;
}) {
	const session = getSessionOptional();
	const isMember = $derived(session?.isMember ?? false);
	const read = createQuery(() => ({
		...deletionPreviewQuery(),
		enabled: browser && isMember && options.active()
	}));

	let pending = $state<DeletionPendingCode | null>(null);
	let resendAt = 0;
	let answerLost = false;
	let sending = $state(false);
	let confirming = $state(false);
	let resending = false;
	let code = $state('');
	let sendError = $state<string | null>(null);
	let codeError = $state<string | null>(null);
	let resendFeedback = $state<DeletionResendFeedback | null>(null);
	let done = $state(false);

	const facts = $derived(isMember && read.data ? read.data : null);
	const view = $derived<DeletionReviewView>(facts ? 'ready' : read.isError ? 'failed' : 'loading');
	const preview = $derived(facts ? buildDeletionPreview(facts, options.locale()) : null);
	const destination = $derived(
		pending
			? deletionDestination(pending.destinationMasked, pending.channel, options.locale())
			: null
	);

	function forget() {
		pending = null;
		resendAt = 0;
		answerLost = false;
		code = '';
		sendError = null;
		codeError = null;
		resendFeedback = null;
	}

	// 🔴 U-65.6: a sign-out, or another account in this tab, takes the code's hand-off with it.
	let seen = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		const forgotten = session?.forgotten ?? 0;
		if (forgotten === seen) return;
		seen = forgotten;
		untrack(() => {
			if (!done) forget();
		});
	});

	// The session gate refused the preview itself (`EC401`): the page asks who is there again — once per refusal — and
	// a guest leaves.
	let refusedAt = 0;
	$effect(() => {
		if (!read.isError || readDeletionFailure(read.error) !== 'session-ended') return;
		const at = read.errorUpdatedAt;
		if (at === refusedAt) return;
		refusedAt = at;
		untrack(() => session?.retryRead());
	});

	function issue(next: Omit<DeletionPendingCode, 'issuedAt'>) {
		pending = { ...next, issuedAt: Date.now() };
		resendAt = Date.now() + RESEND_COOLDOWN_MS;
		answerLost = false;
		code = '';
		codeError = null;
		resendFeedback = null;
	}

	/** The deletion is done: the end shows FIRST, then the browser's session closes under it. */
	async function complete() {
		done = true;
		code = '';
		codeError = null;
		resendFeedback = null;
		await session?.accountDeleted();
	}

	/**
	 * The server refused the session itself. After a confirm whose answer was lost that refusal IS the deletion;
	 * otherwise the session simply ended: the page asks who is there, and the guest leaves for the «Προφίλ».
	 */
	function sessionRefused() {
		if (answerLost) {
			void complete();
			return;
		}
		forget();
		session?.retryRead();
	}

	const secondsLeft = () => Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));

	return {
		get view() {
			return view;
		},
		/** The preview as the page prints it, `null` until it is read. */
		get preview() {
			return preview;
		},
		get sending() {
			return sending;
		},
		get sendError() {
			return sendError;
		},
		/** A code that can still be verified is out (the server's ten minutes). */
		get hasCode() {
			return pending !== null && Date.now() - pending.issuedAt < CODE_LIFETIME_MS;
		},
		/** Reached through a throttled send: «Σας έχουμε ήδη στείλει κωδικό…». */
		get recentCode() {
			return pending?.recent ?? false;
		},
		/** Where the code went, as the page may print it: the server's mask, or «email σας» / «κινητό σας». */
		get destination() {
			return destination;
		},
		get code() {
			return code;
		},
		set code(typed: string) {
			code = cleanDeletionCode(typed);
		},
		get canConfirm() {
			return pending !== null && code.length === DELETION_CODE_LENGTH && !confirming;
		},
		get confirming() {
			return confirming;
		},
		get codeError() {
			return codeError;
		},
		get resendFeedback() {
			return resendFeedback;
		},
		get done() {
			return done;
		},
		/** «Δοκιμάστε ξανά» of a failed read. */
		retry() {
			if (isMember) void read.refetch();
		},
		/**
		 * «Αποστολή κωδικού»: ONE send per press (a press while one is out is ignored), then the code step. A throttled
		 * send means a code is already out there, so the step opens saying so; a refused account has no way on at all.
		 */
		async send() {
			if (!facts?.allowed || sending) return;
			const { codeChannel, codeDestinationMasked } = facts;
			sending = true;
			sendError = null;
			try {
				const sent = await startDeletion();
				const channel = sent?.channel ?? codeChannel ?? 'email';
				issue({
					channel,
					destinationMasked: channel === codeChannel ? codeDestinationMasked : null,
					recent: false
				});
				options.onCodeSent();
			} catch (error) {
				const kind = readDeletionFailure(error);
				if (kind === 'session-ended') sessionRefused();
				else if (kind === 'rate-limited' && codeChannel) {
					issue({ channel: codeChannel, destinationMasked: codeDestinationMasked, recent: true });
					options.onCodeSent();
				} else sendError = deletionFailureMessage(kind, 'send', options.locale());
			} finally {
				sending = false;
			}
		},
		/**
		 * «Οριστική διαγραφή»: ONE confirm per press. No answer, or one that cannot be read, may hide a deletion that
		 * happened: the code stays, and the reader is asked to press again. A refusal the page reads empties the field.
		 */
		async confirm() {
			if (!pending || done || confirming || code.length < DELETION_CODE_LENGTH) return;
			const answerWait = new AbortController();
			const overdue = setTimeout(() => answerWait.abort(), CONFIRM_ANSWER_LIMIT_MS);
			confirming = true;
			codeError = null;
			resendFeedback = null;
			try {
				await confirmDeletion(code, answerWait.signal);
				await complete();
			} catch (error) {
				const kind = readDeletionFailure(error);
				if (kind === 'unreachable' || kind === 'unknown') {
					answerLost = true;
					codeError = deletionFailureMessage(kind, 'confirm', options.locale());
				} else if (kind === 'session-ended') sessionRefused();
				else {
					code = '';
					codeError = deletionFailureMessage(kind, 'confirm', options.locale());
				}
			} finally {
				clearTimeout(overdue);
				confirming = false;
			}
		},
		/**
		 * «Αποστολή ξανά»: the link is always there, so a refusal is spoken rather than hidden. Only this page's own
		 * mirror of the cooldown may name a number of seconds; a confirm on its way owns the code and blocks it.
		 */
		async resend() {
			if (!pending || done || resending || confirming) return;
			const wait = secondsLeft();
			if (wait > 0) {
				resendFeedback = { kind: 'wait', message: deletionResendWait(wait, options.locale()) };
				return;
			}
			resending = true;
			codeError = null;
			resendFeedback = null;
			try {
				await startDeletion();
				// A send that was accepted proves the account still exists: an answer lost earlier deleted nothing.
				issue({ ...pending, recent: pending.recent });
				resendFeedback = {
					kind: 'sent',
					message: m.profile_account_deletion_code_resend_sent({}, { locale: options.locale() })
				};
			} catch (error) {
				const kind = readDeletionFailure(error);
				if (kind === 'session-ended') sessionRefused();
				else if (kind === 'rate-limited') {
					resendAt = Date.now() + RESEND_COOLDOWN_MS;
					resendFeedback = {
						kind: 'wait',
						message: deletionFailureMessage(kind, 'send', options.locale())
					};
				} else codeError = deletionFailureMessage(kind, 'send', options.locale());
			} finally {
				resending = false;
			}
		},
		/** The end was left (another address): nothing of the flow stays in the page. */
		reset() {
			done = false;
			forget();
		}
	};
}

export type AccountDeletion = ReturnType<typeof useAccountDeletion>;
