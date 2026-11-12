import { isUuid } from '$shared/lib/ids';

/** U-65.6: an address's conversation is checked at the boundary; anything but an id is no page (the site's one rule). */
export function isConversationId(value: string): boolean {
	return isUuid(value);
}

export const messagesPath = '/messages';
export const messagesArchivePath = '/messages/archive';

export function conversationPath(conversationId: string): string {
	return `${messagesPath}/${encodeURIComponent(conversationId)}`;
}
