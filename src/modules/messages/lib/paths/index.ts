const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** U-65.6: an address's conversation is checked at the boundary; anything but an id is no page. */
export function isConversationId(value: string): boolean {
	return UUID.test(value);
}

export const messagesPath = '/messages';
export const messagesArchivePath = '/messages/archive';

export function conversationPath(conversationId: string): string {
	return `${messagesPath}/${encodeURIComponent(conversationId)}`;
}
