<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import { BookingDraft, setBookingDraft } from '$modules/appointments/ui/booking-draft';
	import BirthDate from './birth-date.svelte';
	import Code from './code.svelte';
	import ForWhom from './for-whom.svelte';
	import Review from './index.svelte';
	import Name from './name.svelte';
	import Phone from './phone.svelte';
	import Relative from './relative.svelte';
	import Service from './service.svelte';
	import Success from './success.svelte';
	import Time from './time.svelte';
	import type {
		BookingMobileProps,
		BookingReviewProps,
		BookingServiceProps,
		BookingSuccessProps,
		BookingTimeProps
	} from '../types';

	/** The «Αλλαγή» screens of part 2, by their step. */
	const PAGES = {
		service: Service,
		'for-whom': ForWhom,
		relative: Relative,
		'details/phone': Phone,
		'details/code': Code,
		'details/name': Name,
		'details/birth-date': BirthDate
	};

	let {
		start = 'member',
		draft = new BookingDraft(),
		toasts = new ToastState(),
		review,
		time,
		change,
		success,
		onReady
	}: {
		start?: SessionStatus;
		draft?: BookingDraft;
		toasts?: ToastState;
		review?: BookingReviewProps;
		time?: Omit<BookingTimeProps, 'picker'>;
		change?: { step: keyof typeof PAGES; props: BookingServiceProps & BookingMobileProps };
		success?: BookingSuccessProps;
		onReady?: (handle: { session: Session; signIn: () => void; client: QueryClient }) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
		signOut: async () => {
			status = 'guest';
		},
		expire: () => {
			status = 'guest';
		}
	});
	setSession(session);
	const client = useQueryClient();
	untrack(() => setToasts(toasts));
	untrack(() => setBookingDraft(draft));
	untrack(() =>
		onReady?.({
			session,
			client,
			signIn: () => {
				status = 'member';
				session.completeSignIn();
			}
		})
	);
</script>

{#snippet picker()}
	<p data-testid="fake-picker">Επιλογή ώρας</p>
{/snippet}

<!-- Tests only: screen 30, a «Αλλαγή» screen or screen 31 with the root's session, toasts and booking draft. -->
{#if review}
	<Review {...review} />
{:else if time}
	<Time {...time} {picker} />
{:else if change}
	{@const Page = PAGES[change.step]}
	<Page {...change.props} />
{:else if success}
	<Success {...success} />
{/if}
