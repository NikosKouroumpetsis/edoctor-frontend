import { createContext } from '$shared/lib/headless';

/** Where the count comes from: the notifications module's own read, never a copy of it. */
export type NotificationBadgeSource = {
	/** The notifications still new; `0` for a guest and until the read has answered. */
	count: () => number;
};

/**
 * 🔴 Wave 4.5 · screen 63 (D-W45-17, D-W45-49): «there is a new notification» as the rest of the site sees it, one per
 * page tree (context, never a module singleton) — the notifications module owns the ONE read (`unread-count`), and the
 * frame's menu and the «Προφίλ»'s bell only draw it; none of them imports the other. It stands beside `InboxBadge` (the
 * messages' unread conversations, U-84 Π5) and never in its place.
 */
export class NotificationBadge {
	#source: NotificationBadgeSource;
	readonly count = $derived.by(() => this.#source.count());
	readonly hasNew = $derived(this.count > 0);

	constructor(source: NotificationBadgeSource) {
		this.#source = source;
	}
}

export const [getNotificationBadge, setNotificationBadge, getNotificationBadgeOptional] =
	createContext<NotificationBadge>('NotificationBadge');
