<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { page } from '$app/state';
	import { deLocalizeHref } from '$paraglide/runtime';
	import { ApiError } from '$shared/lib/http';
	import { InboxBadge, setInboxBadge } from '$shared/state/inbox-badge';
	import { getSessionOptional } from '$shared/state/session';
	import { unreadCountQuery } from '$modules/messages/api/conversations';
	import { BADGE_POLL_MS, INBOX_POLL_MS } from '$modules/messages/config/limits';
	import { messagesPath } from '$modules/messages/lib/paths';
	import { setInboxMemory, useInboxMemory } from '$modules/messages/ui/inbox-memory';
	import type { MessagesUnreadHostProps } from '../types';

	let { children }: MessagesUnreadHostProps = $props();

	const session = getSessionOptional();
	const isMember = $derived(session?.isMember ?? false);
	const onInbox = $derived(deLocalizeHref(page.url.pathname).startsWith(messagesPath));

	// 🔴 U-84: polling only for a member: a guest asks nothing and no timer runs (and `enabled` goes false at a sign-out,
	// which stops it). 30 s on the messages' pages, 60 s elsewhere, only while the page shows.
	const unread = createQuery(() =>
		unreadCountQuery(isMember, onInbox ? INBOX_POLL_MS : BADGE_POLL_MS)
	);

	// A session that has ended shows here first: the page asks who it is, and learns it knows nobody.
	$effect(() => {
		if (isMember && unread.error instanceof ApiError && unread.error.status === 401) {
			session?.retryRead();
		}
	});

	setInboxBadge(new InboxBadge({ count: () => (isMember ? (unread.data ?? 0) : 0) }));
	// R-10, R-11: what the messages' pages keep from one to the next lives above them.
	setInboxMemory(useInboxMemory());
</script>

<!-- U-84 Π5: the one read of the unread badge, for the whole site; the frame draws it and knows nothing of this module. -->
{@render children()}
