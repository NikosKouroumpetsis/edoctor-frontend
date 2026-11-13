import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { m } from '$paraglide/messages.js';
import { PERSONAL_CODE_LENGTH } from '$modules/profile/config/personal';
import {
	cleanPersonalCode,
	personalChallengeMessage,
	personalResendDeadline,
	personalResendSecondsLeft,
	personalResendWaitLabel
} from '$modules/profile/lib/personal';
import type { PersonalChallengeFailure } from '$modules/profile/types';
import type { PersonalChallengePort } from '../types';

type ChallengeStep = 'value' | 'code';

// The refusals that speak of the VALUE (the address, the number): they are said under its field, on step 1.
const VALUE_FAILURES: readonly PersonalChallengeFailure[] = [
	'taken',
	'provider-google',
	'provider-apple',
	'provider-both',
	'invalid-value'
];

/**
 * The two steps of a challenge — the sign-in email's and the mobile's (record §5.3): the value, then the 6-digit code
 * sent to it, with «Αποστολή ξανά» (60″ apart) and the way back to step 1. Until the right code the old value holds.
 * One press is one request. 🔴 U-168 / U-65.6: the code and where it went live HERE alone — a rune of the open row,
 * gone when the row closes — never in an address, a storage, a cache or a log.
 */
export function useCodeChallenge(options: {
	channel: 'email' | 'phone';
	port: () => PersonalChallengePort;
	locale: () => SupportedLocale;
	/** The words under the value's field when the server says it is the account's already. */
	already: () => string;
	onStep?: (step: ChallengeStep) => void;
	/** The code was right: the row's own end (the reads again, the passing word). */
	onVerified: () => Promise<void>;
	onResent: () => void;
	onSessionEnded: () => void;
}) {
	let step = $state<ChallengeStep>('value');
	let destination = $state('');
	let code = $state('');
	let valueError = $state<string | undefined>(undefined);
	let codeError = $state<string | undefined>(undefined);
	let failure = $state<string | null>(null);
	let resendWait = $state<string | null>(null);
	let pending = $state(false);
	let resendAt: number | null = null;

	const words = (kind: PersonalChallengeFailure, at: ChallengeStep) =>
		personalChallengeMessage(kind, options.channel, at, { locale: options.locale() });

	function go(next: ChallengeStep) {
		step = next;
		options.onStep?.(next);
	}

	function clear() {
		valueError = undefined;
		codeError = undefined;
		failure = null;
		resendWait = null;
	}

	/** Back on step 1 with what was typed still in its field; the code that was out is of no use any more. */
	function toValue() {
		code = '';
		resendAt = null;
		go('value');
	}

	/** A refusal of step 2 (the code, a resend): what speaks of the value or of a spent code goes back to step 1. */
	function refused(error: unknown) {
		const kind = options.port().failureOf(error);
		if (kind === 'session') {
			options.onSessionEnded();
			return;
		}
		if (VALUE_FAILURES.includes(kind) && kind !== 'invalid-value') {
			toValue();
			valueError = words(kind, 'value') ?? undefined;
		} else if (kind === 'stale-code') {
			toValue();
			failure = words(kind, 'code');
		} else if (kind === 'unknown') {
			failure = words(kind, 'code');
		} else {
			code = '';
			codeError = words(kind, 'code') ?? undefined;
		}
	}

	return {
		get step() {
			return step;
		},
		/** Where the code went, in the person's own just-typed words. */
		get destination() {
			return destination;
		},
		get code() {
			return code;
		},
		set code(typed: string) {
			code = cleanPersonalCode(typed);
			codeError = undefined;
		},
		get valueError() {
			return valueError;
		},
		set valueError(message: string | undefined) {
			valueError = message;
		},
		get codeError() {
			return codeError;
		},
		get failure() {
			return failure;
		},
		get resendWait() {
			return resendWait;
		},
		get pending() {
			return pending;
		},
		/** Step 1's «Συνέχεια»: `value` travels, `shown` is what step 2 says the code went to. */
		async start(value: string, shown: string) {
			if (pending) return;
			pending = true;
			clear();
			try {
				const answer = await options.port().start(value);
				if (answer.alreadyVerified) {
					valueError = options.already();
					return;
				}
				destination = shown;
				code = '';
				resendAt = personalResendDeadline(Date.now());
				go('code');
			} catch (error) {
				const kind = options.port().failureOf(error);
				if (kind === 'session') options.onSessionEnded();
				else if (kind === 'unknown' || kind === 'stale-code' || kind === 'invalid-code') {
					failure = words('unknown', 'value');
				} else valueError = words(kind, 'value') ?? undefined;
			} finally {
				pending = false;
			}
		},
		/** Step 2's «Επαλήθευση»: six digits first, said here before any request. */
		async verify() {
			if (pending) return;
			clear();
			if (code.length !== PERSONAL_CODE_LENGTH) {
				codeError = m.profile_personal_code_errors_length({}, { locale: options.locale() });
				return;
			}
			pending = true;
			try {
				await options.port().verify(code);
				await options.onVerified();
			} catch (error) {
				refused(error);
			} finally {
				pending = false;
			}
		},
		/** «Αποστολή ξανά»: always there, so a wait is spoken — only this page's own clock may name its seconds. */
		async resend() {
			if (pending) return;
			const left = personalResendSecondsLeft(resendAt, Date.now());
			clear();
			if (left > 0) {
				resendWait = personalResendWaitLabel(left, { locale: options.locale() });
				return;
			}
			pending = true;
			try {
				await options.port().resend();
				code = '';
				resendAt = personalResendDeadline(Date.now());
				options.onResent();
			} catch (error) {
				if (options.port().failureOf(error) === 'rate-limited') {
					resendAt = personalResendDeadline(Date.now());
					resendWait = words('rate-limited', 'code');
				} else refused(error);
			} finally {
				pending = false;
			}
		},
		/** «Άλλο email» / «Άλλος αριθμός». */
		other() {
			if (pending) return;
			clear();
			toValue();
		}
	};
}

export type CodeChallenge = ReturnType<typeof useCodeChallenge>;
