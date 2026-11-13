<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { removePersonalQueries } from '$shared/query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, Toaster, ToastState } from '$shared/ui/molecules/toast';
	import type { NotificationInboxLinks } from '../types';
	import NotificationInbox from './index.svelte';

	type Choice = 'new' | 'previous' | 'all' | null;

	let {
		start = 'member',
		locale = 'el',
		filter: asked = null,
		offline = false,
		readFailed = false,
		onReady
	}: {
		start?: SessionStatus;
		locale?: SupportedLocale;
		/** The choice the address names when the page opens. */
		filter?: Choice;
		offline?: boolean;
		/** The session's read got no answer (an outage). */
		readFailed?: boolean;
		onReady?: (handle: {
			session: Session;
			client: QueryClient;
			/** The session's read answers. */
			answer: (status: SessionStatus) => void;
			/** Another address of the same page: a pill or a menu row was followed. */
			go: (filter: Choice) => void;
			/** How many times the page asked the session again. */
			retries: () => number;
		}) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	let filter = $state<Choice>(untrack(() => asked));
	let retries = 0;
	const client = useQueryClient();
	// The reads ask once more after a failure that is no refusal (their own rule); a test does not wait a second for it.
	untrack(() =>
		client.setDefaultOptions({
			queries: { ...client.getDefaultOptions().queries, retryDelay: 0 }
		})
	);
	// What the site's host does at a sign-out and at a write's `401` (`auth/ui/host`): nobody, no personal read kept.
	const end = () => {
		status = 'guest';
		removePersonalQueries(client);
	};
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
		failed: () => readFailed && status === 'unknown',
		retry: () => {
			retries += 1;
		},
		signOut: async () => end(),
		expire: end
	});
	setSession(session);
	const toasts = setToasts(new ToastState());

	// The screen's addresses, as it resolves them: each choice a word of the query, each target the other module's page.
	const links: NotificationInboxLinks = {
		profile: '/profile',
		settings: '/profile/account-settings/notifications',
		filter: (choice) => `/notifications?filter=${choice}`,
		target: (target) =>
			target.kind === 'appointment' ? `/appointments/${target.id}` : `/ratings/${target.id}`
	};

	untrack(() =>
		onReady?.({
			session,
			client,
			answer: (next) => (status = next),
			go: (next) => (filter = next),
			retries: () => retries
		})
	);
</script>

<!-- Tests only: screen 63 under a session and the frame's toast, with the addresses the screen gives it, as the site's
     root composes them. -->
<NotificationInbox {locale} {filter} {links} {offline} />
<Toaster {toasts} />
