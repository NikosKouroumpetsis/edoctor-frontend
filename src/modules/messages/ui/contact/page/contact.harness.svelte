<script lang="ts">
	import { untrack } from 'svelte';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import type { ContactDoctorFacts } from '$modules/messages/types';
	import { useContactDoctor } from '../hooks/use-contact.svelte';
	import ContactButton from '../components/contact-button.svelte';
	import ContactDialog from './index.svelte';

	let {
		start = 'member',
		hasPatientProfile = true,
		toasts = new ToastState(),
		doctor,
		onReady
	}: {
		start?: SessionStatus;
		hasPatientProfile?: boolean;
		toasts?: ToastState;
		doctor: ContactDoctorFacts;
		onReady?: (handle: { session: Session; signIn: () => void }) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Μαρία', hasPatientProfile } : null),
		signOut: async () => {
			status = 'guest';
		},
		expire: () => {
			status = 'guest';
		}
	});
	setSession(session);
	untrack(() => setToasts(toasts));
	untrack(() =>
		onReady?.({
			session,
			signIn: () => {
				status = 'member';
				session.completeSignIn();
			}
		})
	);

	const flow = useContactDoctor({
		doctor: () => doctor,
		locale: () => 'el',
		conversationHref: (id) => `/messages/${id}`
	});
</script>

<ContactButton {flow} locale="el" />
<ContactDialog {flow} {doctor} locale="el" bookHref="/doctors/dr-athena/details/availability" />
