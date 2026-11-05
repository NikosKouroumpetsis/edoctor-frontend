import { createContext } from '$shared/lib/headless';

/** Where the count comes from: the messages module's own read, never a copy of it. */
export type InboxBadgeSource = {
	/** Conversations with something unread; `0` for a guest. */
	count: () => number;
};

/**
 * 🔴 U-84 Π5: the unread badge as the rest of the site sees it, one per page tree (context, never a module singleton):
 * the messages module owns the read and the frame only draws it, and neither imports the other.
 */
export class InboxBadge {
	#source: InboxBadgeSource;

	readonly count = $derived.by(() => this.#source.count());
	readonly hasUnread = $derived(this.count > 0);
	/** The badge's words: the number, «9+» past nine (the application's tab). */
	readonly label = $derived(this.count > 9 ? '9+' : String(this.count));

	constructor(source: InboxBadgeSource) {
		this.#source = source;
	}
}

export const [getInboxBadge, setInboxBadge, getInboxBadgeOptional] =
	createContext<InboxBadge>('InboxBadge');
