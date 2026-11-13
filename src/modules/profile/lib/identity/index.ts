import type { SessionMember } from '$shared/state/session';
import type { ProfileIdentity } from '$modules/profile/types';

const part = (value: string | null | undefined) => value?.trim() || null;

/**
 * 🔴 D-W45-18 (screen 56, U-168): what the name card of the «Προφίλ» says, from the session's own facts. With a name:
 * its initial, «Όνομα Επώνυμο» and under it the sign-in address as the SERVER hides it — else the mobile, hidden the same
 * way. Without a name (an account with no patient's profile): no initial (the card draws a person), and the hidden
 * address or mobile as the one line — or no line at all when the server named neither (the application's
 * `buildProfileNameCard`, the same rule). `null` only for nobody (a guest). Nothing is hidden here.
 */
export function buildProfileIdentity(
	member: SessionMember | null | undefined
): ProfileIdentity | null {
	if (!member) return null;
	const name = [part(member.firstName), part(member.lastName)].filter(Boolean).join(' ');
	const masked = part(member.maskedLoginEmail) ?? part(member.maskedLoginPhone);
	if (name) {
		return { initial: [...name][0].toLocaleUpperCase(), title: name, line: masked };
	}
	return { initial: null, title: masked, line: null };
}
