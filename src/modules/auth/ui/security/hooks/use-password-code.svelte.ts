import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { initSetPassword } from '$modules/auth/api/password-credential';
import { readAccountPasswordFailure } from '$modules/auth/lib/failures';
import {
	securityCodeSendFailureWords,
	securityResendDeadline,
	securityResendSecondsLeft,
	securityResendWaitLabel
} from '$modules/auth/lib/security';

/**
 * The code a password is set with (record §5.4: «Ορισμός», «Ξέχασα τον κωδικό μου»): mailed to the account's own
 * address by the SAME call the sign-in's flow makes (`initSetPassword`), then «Αποστολή ξανά» — the server's 60″ apart,
 * told by this page's own clock. One press is one request; a row opened again inside that minute asks for no second
 * code (the one that is out still holds). Nothing typed lives here: only whether a send is out and what it answered.
 */
export function usePasswordCode(options: {
	locale: () => SupportedLocale;
	/** A code went out: the passing word («Στείλαμε έναν κωδικό στο email σας.», «Στείλαμε νέο κωδικό.»). */
	onSent: (again: boolean) => void;
	onSessionEnded: () => void;
	/** The account may set no password after all (its email changed under the page): the row's read is stale. */
	onUnavailable: () => void;
}) {
	let sending = $state(false);
	let failure = $state<string | null>(null);
	let wait = $state<string | null>(null);
	let resendAt: number | null = null;

	const words = () => ({ locale: options.locale() });

	function clear() {
		failure = null;
		wait = null;
	}

	async function send(again: boolean) {
		sending = true;
		try {
			await initSetPassword(options.locale());
			resendAt = securityResendDeadline(Date.now());
			options.onSent(again);
		} catch (error) {
			const kind = readAccountPasswordFailure(error);
			if (kind === 'session') options.onSessionEnded();
			else if (kind === 'rate-limited') {
				// The server is still counting its minute: so does this page from now.
				resendAt = securityResendDeadline(Date.now());
				wait = securityCodeSendFailureWords(kind, words());
			} else {
				failure = securityCodeSendFailureWords(kind, words());
				if (kind === 'unavailable') options.onUnavailable();
			}
		} finally {
			sending = false;
		}
	}

	return {
		get sending() {
			return sending;
		},
		/** A send that did not go through, said over the fields. */
		get failure() {
			return failure;
		},
		/** A code asked for too soon, said under «Αποστολή ξανά». */
		get wait() {
			return wait;
		},
		clear,
		/** The row opened on the code: one code is mailed, unless one went out less than a minute ago. */
		async open() {
			if (sending) return;
			clear();
			if (securityResendSecondsLeft(resendAt, Date.now()) > 0) return;
			await send(false);
		},
		/** «Αποστολή ξανά»: always there, so a wait is spoken — only this page's own clock may name its seconds. */
		async resend() {
			if (sending) return;
			clear();
			const left = securityResendSecondsLeft(resendAt, Date.now());
			if (left > 0) {
				wait = securityResendWaitLabel(left, words());
				return;
			}
			await send(true);
		},
		/** The code that was out is of no use any more (expired, spent): a new one may be asked for at once. */
		spent() {
			resendAt = null;
		}
	};
}

export type PasswordCode = ReturnType<typeof usePasswordCode>;
