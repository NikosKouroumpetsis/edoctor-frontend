import { browser } from '$app/environment';
import { sessionChannelName } from '$shared/config/env';

/** The one word the channel ever carries: the event, never a fact of the person. */
const SIGNED_OUT = 'signed-out';

export type SignOutChannel = {
	/** This tab's sign-out was carried out by the server: the other tabs learn it. */
	announce: () => void;
	close: () => void;
};

/**
 * 🔴 D-W3-37 (security web MINOR-2): a sign-out in one tab of this browser reaches its other tabs of this site — the
 * cookies live on the API, one jar, so the session has ended there too. Only the event travels (`BroadcastChannel`,
 * same origin, same browser), never a fact of the person; anything else on the channel is ignored. Without the channel
 * (the server, an old browser) nothing happens.
 */
export function openSignOutChannel(onSignedOutElsewhere: () => void): SignOutChannel {
	if (!browser || typeof BroadcastChannel === 'undefined') {
		return { announce: () => {}, close: () => {} };
	}
	const channel = new BroadcastChannel(sessionChannelName);
	channel.onmessage = (event: MessageEvent<unknown>) => {
		if (event.data === SIGNED_OUT) onSignedOutElsewhere();
	};
	return {
		announce: () => channel.postMessage(SIGNED_OUT),
		close: () => channel.close()
	};
}
