<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { removePersonalQueries } from '$shared/query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, Toaster, ToastState } from '$shared/ui/molecules/toast';
	import NotificationSettings from './index.svelte';

	let {
		start = 'member',
		locale = 'el',
		offline = false,
		onReady
	}: {
		start?: SessionStatus;
		locale?: SupportedLocale;
		offline?: boolean;
		onReady?: (handle: {
			session: Session;
			client: QueryClient;
			/** The session's read answers. */
			answer: (status: SessionStatus) => void;
		}) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const client = useQueryClient();
	// What the site's host does at a sign-out and at a write's `401` (`auth/ui/host`): nobody, no personal read kept.
	const end = () => {
		status = 'guest';
		removePersonalQueries(client);
	};
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
		signOut: async () => end(),
		expire: end
	});
	setSession(session);
	const toasts = setToasts(new ToastState());
	untrack(() => onReady?.({ session, client, answer: (next) => (status = next) }));
</script>

<!-- Tests only: screen 60 under a session and the frame's toast, as the site's root composes them. -->
<NotificationSettings {locale} {offline} />
<Toaster {toasts} />
