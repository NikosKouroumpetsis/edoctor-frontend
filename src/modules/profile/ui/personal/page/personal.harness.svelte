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
	import type { PersonalPorts } from '../types';
	import Personal from './index.svelte';

	let {
		member,
		ports,
		client,
		locale = 'el',
		offline = false,
		onReady
	}: {
		/** Who the session names: the names and the SERVER's masks. */
		member: SessionMember;
		ports: PersonalPorts;
		/** The page's client, so a spec can read what its cache keeps. */
		client: QueryClient;
		locale?: SupportedLocale;
		offline?: boolean;
		onReady?: (handle: {
			session: Session;
			status: () => SessionStatus;
			/** The session's read answers again (what a refresh brings back). */
			answer: (next: SessionMember) => void;
		}) => void;
	} = $props();

	let current = $state<SessionMember>(untrack(() => member));
	let status = $state<SessionStatus>('member');
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? current : null),
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
	untrack(() => onReady?.({ session, status: () => status, answer: (next) => (current = next) }));
</script>

<!-- Tests only: «Προσωπικά στοιχεία» under a session, a client and the frame's toast, as the site's root composes them.
     Like the shell, the page is drawn for a member alone. -->
<QueryClientProvider {client}>
	{#if session.isMember}
		<Personal {locale} {ports} {offline} />
	{/if}
	<Toaster {toasts} />
</QueryClientProvider>
