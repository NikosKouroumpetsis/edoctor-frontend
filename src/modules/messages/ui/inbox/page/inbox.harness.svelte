<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import { removePersonalQueries } from '$shared/query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import type { MessagesLinks } from '$modules/messages/types';
	import type { MessagesSide } from '$modules/messages/types';
	import { setInboxMemory, type InboxMemory } from '$modules/messages/ui/inbox-memory';
	import type { InboxFreshPatient } from '../types';
	import Inbox from './index.svelte';

	let {
		start = 'member',
		side = 'patient',
		conversationId = null,
		archive = false,
		fresh = null,
		hasPatientProfile = true,
		toasts = new ToastState(),
		memory,
		seed,
		onReady
	}: {
		start?: SessionStatus;
		side?: MessagesSide;
		conversationId?: string | null;
		archive?: boolean;
		fresh?: InboxFreshPatient | null;
		hasPatientProfile?: boolean;
		toasts?: ToastState;
		/** What the site keeps above the page: given, it outlives this page (the routes change the page). */
		memory?: InboxMemory;
		/** What was in the cache before the page opened (the #18's note). */
		seed?: (client: QueryClient) => void;
		onReady?: (handle: { session: Session; signIn: () => void }) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const client = useQueryClient();
	untrack(() => seed?.(client));

	// As the auth host does: a guest keeps nothing of a member's (`removePersonalQueries`).
	const leave = () => {
		status = 'guest';
		removePersonalQueries(client);
	};
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Μαρία', hasPatientProfile } : null),
		signOut: async () => leave(),
		expire: leave
	});
	setSession(session);
	untrack(() => setToasts(toasts));
	untrack(() => memory && setInboxMemory(memory));
	untrack(() =>
		onReady?.({
			session,
			signIn: () => {
				status = 'member';
				session.completeSignIn();
			}
		})
	);

	const links: MessagesLinks = {
		list: '/messages',
		archive: '/messages/archive',
		conversation: (id) => `/messages/${id}`,
		doctorProfile: (slug) => `/doctors/${slug}`,
		search: '/',
		patientCard: (patientId) => `/doctor/patients/account/${patientId}`
	};
</script>

<Inbox locale="el" {links} {side} {conversationId} {archive} {fresh} />
