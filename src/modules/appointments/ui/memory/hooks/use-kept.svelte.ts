import { untrack } from 'svelte';
import { getSessionOptional } from '$shared/state/session';

type Kept<Value> = { key: string; value: Value; mark: number };

/**
 * 🔴 D-W4-78 (U-84; review w4-w9-r1 MAJOR-1) · what a member's page has OPEN stays through a session that ended on a
 * write, so the form on it keeps what the person wrote. `current` is the member's own read (`live`) while there is
 * one. With none, the last one read for the SAME address (`key`) stands in for it, and only:
 * - while the sign-in the `401` opened is still open (`Session.expired`): the form stays under it;
 * - then for the same person signed in again, until their own read is back, or says there is none (`gone`).
 * Never else. Nothing kept stands in for: a guest who opens the address (nothing was read here); a sign-out by hand or
 * in another tab, another account (`Session.forgotten` moved — the kept one is the last person's); the sign-in closed
 * without signing in (a guest's page); an account the server knows no patient for; another address. Once let go it is
 * gone: whoever signs in later starts from their own read.
 */
export function useKeptThroughExpiry<Value>(options: {
	/** What the address names (an appointment, a relative, «new»), `null` for nothing to keep. */
	key: () => string | null;
	/** The member's own read, `null` while there is none. */
	live: () => Value | null;
	/** The member's own read answered with none (not theirs, not found, no longer there). */
	gone: () => boolean;
}) {
	const session = getSessionOptional();
	let kept = $state.raw<Kept<Value> | null>(null);
	// The kept one went under a sign-in (`expired`): only then may it stand in for the same person's read on its way.
	let carried = $state(false);

	const stranger = () => session?.member?.hasPatientProfile === false;
	const standing = $derived.by((): Value | null => {
		if (!session || !kept || stranger()) return null;
		if (kept.key !== options.key() || kept.mark !== session.forgotten) return null;
		if (session.expired) return kept.value;
		return carried && session.isMember && !options.gone() ? kept.value : null;
	});
	const current = $derived(options.live() ?? standing);

	$effect(() => {
		const value = options.live();
		const key = options.key();
		const expired = session?.expired ?? false;
		const member = session?.isMember ?? false;
		const mark = session?.forgotten ?? 0;
		const gone = options.gone();
		const unknown = stranger();
		untrack(() => {
			if (value !== null && key !== null) {
				kept = { key, value, mark };
				carried = false;
				return;
			}
			if (!kept) return;
			if (kept.key === key && kept.mark === mark && !unknown) {
				if (expired) {
					carried = true;
					return;
				}
				if (carried && member && !gone) return;
			}
			kept = null;
			carried = false;
		});
	});

	return {
		/** The member's own read, or what stands in for it under a sign-in and until it is back; `null` for neither. */
		get current() {
			return current;
		}
	};
}
