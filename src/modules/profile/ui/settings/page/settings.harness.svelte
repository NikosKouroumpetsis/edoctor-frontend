<script lang="ts">
	import { untrack } from 'svelte';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, Toaster, ToastState } from '$shared/ui/molecules/toast';
	import type { SettingsPageId, SettingsSectionId } from '$modules/profile/types';
	import type { SettingsLinks } from '../types';
	import Settings from './index.svelte';

	let {
		start = 'member',
		readFailed = false,
		section = null,
		page = null,
		locale = 'el',
		onReady
	}: {
		start?: SessionStatus;
		/** The browser asked the session and got no answer (an outage). */
		readFailed?: boolean;
		section?: SettingsSectionId | null;
		/** The page of that section the address names (screen 62). */
		page?: SettingsPageId | null;
		locale?: SupportedLocale;
		onReady?: (handle: {
			session: Session;
			/** The session's read answers. */
			answer: (status: SessionStatus) => void;
			/** The route's `load` answering another address of the same page (SvelteKit keeps the page component). */
			go: (next: SettingsSectionId | null, page?: SettingsPageId | null) => void;
		}) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	let current = $state<SettingsSectionId | null>(untrack(() => section));
	let currentPage = $state<SettingsPageId | null>(untrack(() => page));
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
		signOut: async () => {
			status = 'guest';
		},
		failed: () => readFailed
	});
	setSession(session);
	const toasts = setToasts(new ToastState());
	untrack(() =>
		onReady?.({
			session,
			answer: (next) => (status = next),
			go: (next, nextPage = null) => {
				current = next;
				currentPage = nextPage;
			}
		})
	);

	const links: SettingsLinks = {
		profile: '/profile',
		list: '/profile/account-settings',
		section: (id) => (id === 'privacy' ? '/profile/privacy' : `/profile/account-settings/${id}`),
		page: (id) => `/profile/pages/${id}`
	};
</script>

<!-- «Προσωπικά στοιχεία» (screen 58): the screen hands it in with the calls of the modules that own them; a mark here. -->
{#snippet personal()}
	<p data-testid="settings-handed-personal">personal</p>
{/snippet}

<!-- A section another module owns («Ειδοποιήσεις»): the screen hands its page in; here a mark stands for it. -->
{#snippet notifications()}
	<p data-testid="settings-handed-notifications">notifications</p>
{/snippet}

<!-- «Απόρρητο» and the pages it opens (screen 62): the screen composes them; here a mark stands for each. -->
{#snippet privacy()}
	<p data-testid="settings-handed-privacy">privacy</p>
{/snippet}

{#snippet tools()}
	<p data-testid="settings-handed-tools">tools</p>
{/snippet}

{#snippet deletion()}
	<p data-testid="settings-handed-deletion">deletion</p>
{/snippet}

{#snippet deletionCode()}
	<p data-testid="settings-handed-deletion-code">code</p>
{/snippet}

<!-- Tests only: the shell under a session and the frame's toast, as the site's root composes them. -->
<Settings
	{locale}
	section={current}
	page={currentPage}
	{links}
	languageHref={(next) =>
		`${next === 'en' ? '/en' : ''}/profile/account-settings${current ? `/${current}` : ''}`}
	sectionContent={{ personal, notifications, privacy }}
	pageContent={{
		tools: { title: 'Εργαλεία τρίτων', content: tools },
		deletion: { title: 'Διαγραφή λογαριασμού', content: deletion },
		'deletion-code': { title: 'Επιβεβαίωση διαγραφής', content: deletionCode }
	}}
/>
<Toaster {toasts} />
