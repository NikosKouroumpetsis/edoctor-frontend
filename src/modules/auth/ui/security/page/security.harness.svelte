<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import {
		Session,
		setSession,
		type SessionMember,
		type SessionStatus
	} from '$shared/state/session';
	import { setToasts, Toaster, ToastState } from '$shared/ui/molecules/toast';
	import Security from './index.svelte';

	let {
		member,
		client,
		locale = 'el',
		offline = false,
		start = 'member',
		onReady
	}: {
		/** Who the session names: the names and the SERVER's masks. */
		member: SessionMember;
		/** The page's client, so a spec can read what its cache keeps. */
		client: QueryClient;
		locale?: SupportedLocale;
		offline?: boolean;
		/** A guest's page is drawn too, to see that it asks the server nothing. */
		start?: SessionStatus;
		onReady?: (handle: { session: Session; status: () => SessionStatus }) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const drawnFor = untrack(() => start);
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? member : null),
		signOut: async () => {
			status = 'guest';
		},
		// What the site's host does at a write's `401` (`auth/ui/host`): nobody from this moment.
		expire: () => {
			status = 'guest';
		}
	});
	setSession(session);
	const toasts = setToasts(new ToastState());
	untrack(() => onReady?.({ session, status: () => status }));
</script>

<!-- Tests only: «Σύνδεση και ασφάλεια» under a session, a client and the frame's toast, as the site's root composes
     them. Like the shell, the page is drawn for a member alone — and, when a spec starts as a guest, for the guest. -->
<QueryClientProvider {client}>
	{#if session.isMember || drawnFor !== 'member'}
		<Security {locale} {offline} />
	{/if}
	<Toaster {toasts} />
</QueryClientProvider>
