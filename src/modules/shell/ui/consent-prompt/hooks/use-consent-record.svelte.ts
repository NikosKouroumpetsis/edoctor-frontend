import { untrack } from 'svelte';
import { getSessionOptional } from '$shared/state/session';
import {
	consentDecisionKey,
	forgetRecordedConsent,
	readRecordedConsent,
	writeRecordedConsent,
	type ConsentSnapshot
} from '$shared/storage/consent-storage';
import { recordConsentDecision } from '$modules/shell/api/consent';

/**
 * 🔴 R-4: the decision this browser keeps reaches the server's append-only record once a session exists, and each change
 * of it, within a version too: one request per change, none per load. Marked done only when it was answered, so a failure
 * tries again on the next load, and asked at most once per load, so it never loops. A guest asks nothing; a sign-out or
 * another account starts over.
 */
export function useConsentRecord(snapshot: () => ConsentSnapshot | null) {
	const session = getSessionOptional();
	let seen = untrack(() => session?.forgotten ?? 0);
	let asked: string | null = null;

	function record(current: ConsentSnapshot) {
		if (Object.keys(current.choices).length === 0) return;
		const key = consentDecisionKey(current);
		// What the server was last told: what this load asked, else what an earlier one had answered.
		const recorded = asked === null ? readRecordedConsent() : null;
		if ((recorded ? consentDecisionKey(recorded) : asked) === key) return;
		asked = key;
		const account = seen;
		void recordConsentDecision(current)
			.then(() => {
				// Another decision asked meanwhile is the one to remember, once it is answered.
				if (account === seen && asked === key) writeRecordedConsent(current);
			})
			.catch(() => undefined);
	}

	$effect(() => {
		const status = session?.status;
		const forgotten = session?.forgotten ?? 0;
		const current = snapshot();
		untrack(() => {
			if (status === 'guest' || forgotten !== seen) {
				seen = forgotten;
				asked = null;
				forgetRecordedConsent();
			}
			if (status === 'member' && current) record(current);
		});
	});
}
