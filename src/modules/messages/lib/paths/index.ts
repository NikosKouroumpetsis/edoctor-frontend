import { isUuid } from '$shared/lib/ids';
import type { DoctorConversationTarget } from '$modules/messages/types';

/** U-65.6: an address's conversation is checked at the boundary; anything but an id is no page (the site's one rule). */
export function isConversationId(value: string): boolean {
	return isUuid(value);
}

export const messagesPath = '/messages';
export const messagesArchivePath = '/messages/archive';

export function conversationPath(conversationId: string): string {
	return `${messagesPath}/${encodeURIComponent(conversationId)}`;
}

/**
 * 🔴 D-W51-85 (U-182.3; the application's `/doctor/messages`): the doctor's messages, inside the doctor's frame — the
 * list, a conversation (`/<id>`), «Προηγούμενες συνομιλίες» (`/archive`) and a conversation not started yet (`/new`,
 * U-193.1).
 */
export const doctorMessagesPath = '/doctor/messages';
export const doctorMessagesArchivePath = `${doctorMessagesPath}/archive`;
export const doctorNewConversationPath = `${doctorMessagesPath}/new`;

export function doctorConversationPath(conversationId: string): string {
	return `${doctorMessagesPath}/${encodeURIComponent(conversationId)}`;
}

/**
 * 🔴 D-W51-87: `?kind=&id=` after `/doctor/messages/new` — the patient of screen 73 the doctor writes to first: a closed
 * word and a server id, never a word a person wrote (U-84).
 */
export function doctorNewConversationSearch(target: DoctorConversationTarget): string {
	return `?kind=${target.kind}&id=${encodeURIComponent(target.id)}`;
}

/** What the parser reads of the address's search: one value by its name (the route's `url.searchParams`). */
export type AddressSearch = { get: (name: string) => string | null };

/** What `/doctor/messages/[...path]` shows. */
export type DoctorMessagesAddress =
	| { view: 'list' }
	| { view: 'archive' }
	| { view: 'conversation'; conversationId: string }
	| { view: 'new'; target: DoctorConversationTarget };

const TARGET_KINDS: readonly DoctorConversationTarget['kind'][] = ['account', 'relative'];

/**
 * 🔴 D-W51-85 · D-W51-87 / U-65.6: the route's rest read against a closed list — `''` the list, `archive`, `<id>` a
 * conversation (a server id), `new?kind=account|relative&id=<id>` a conversation not started yet; anything else
 * (another word, a slash more, an id that is not the server's, a record or any other kind) is `undefined`, a 404.
 */
export function readDoctorMessagesAddress(
	rest: string | undefined,
	search: AddressSearch
): DoctorMessagesAddress | undefined {
	if (!rest) return { view: 'list' };
	if (rest === 'archive') return { view: 'archive' };
	if (rest === 'new') {
		const kind = TARGET_KINDS.find((candidate) => candidate === search.get('kind'));
		const id = search.get('id') ?? '';
		return kind && isUuid(id) ? { view: 'new', target: { kind, id } } : undefined;
	}
	return isConversationId(rest) ? { view: 'conversation', conversationId: rest } : undefined;
}

/** Whether a page is one of the messages' (either mode's): the badge asks more often there (U-84.7). */
export function isMessagesPage(basePath: string): boolean {
	return [messagesPath, doctorMessagesPath].some(
		(root) => basePath === root || basePath.startsWith(`${root}/`)
	);
}
