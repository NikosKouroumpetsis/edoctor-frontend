import type { Session } from '$shared/state/session';
import type { ProfileViewer } from '$modules/profile/types';

/**
 * Who reads a page of the «Προφίλ» (the tab, «Ρυθμίσεις λογαριασμού», «Απόρρητο»), as the session tells it (D-W45-05): a
 * member, a guest, or — until the browser has asked the session — the wait. A read that got no answer (an outage) is a
 * guest's: what a guest has there lives on the device and needs no server, so the page never waits on.
 */
export function profileViewerOf(
	session: Pick<Session, 'isMember' | 'status' | 'readFailed'> | undefined
): ProfileViewer {
	if (session?.isMember) return 'member';
	if (!session || session.status === 'guest' || session.readFailed) return 'guest';
	return 'waiting';
}
