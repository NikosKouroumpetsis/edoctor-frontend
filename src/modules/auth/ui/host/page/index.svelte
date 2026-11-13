<script lang="ts">
	import type { Pathname } from '$app/types';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { deLocalizeHref, localizeHref } from '$paraglide/runtime';
	import { useId } from '$shared/lib/headless';
	import { ApiError } from '$shared/lib/http';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { removeMutations, removePersonalQueries, resetPersonalQueries } from '$shared/query';
	import {
		openSignOutChannel,
		Session,
		setSession,
		type SignOutChannel
	} from '$shared/state/session';
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';
	import {
		authQueryKeys,
		getDoctorAccount,
		getPatientSelf,
		logoutSession
	} from '$modules/auth/api/session';
	import { forgetKnownAccount } from '$modules/auth/lib/known-account';
	import AuthFlow, { AuthFlowState, setAuthFlow } from '$modules/auth/ui/flow';
	import { isOnboardingExempt } from '../lib/onboarding';
	import { toSessionFacts } from '../lib/self';
	import type { AuthHostProps } from '../types';

	let { children, onSignInAbandoned }: AuthHostProps = $props();

	const queryClient = useQueryClient();
	const locale = $derived(getPageLocale(page.url));
	const localized = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);

	// 🔴 U-80.1 Ε6: the cookies live on the API, so the page's server knows nobody: it draws a guest and this read, in
	// the browser (`enabled: browser`, the client's default), fills the header. A guest's `401` is an answer, not a
	// failure, so it is never retried; a failed read stays `unknown` and opens nothing (an outage locks nobody out).
	const selfQuery = createQuery(() => ({
		queryKey: authQueryKeys.patientSelf(),
		queryFn: ({ signal }: { signal: AbortSignal }) => getPatientSelf(signal).then(toSessionFacts)
	}));
	const self = $derived(selfQuery.data);

	// 🔴 U-84: a write refused with `401`: the page knows nobody from this very moment, before the read's answer reaches it,
	// so the sign-in that opens now is not taken for one that has just ended.
	let ended = $state(false);
	$effect(() => {
		if (self?.signedIn === false) ended = false;
	});

	// 🔴 D-W3-37: the other tabs of this browser learn a sign-out carried out here (opened in the browser, below).
	let signOutChannel: SignOutChannel | null = null;

	const session = setSession(
		new Session({
			status: () =>
				ended ? 'guest' : self === undefined ? 'unknown' : self.signedIn ? 'member' : 'guest',
			member: () =>
				!ended && self?.signedIn
					? {
							firstName: self.firstName,
							lastName: self.lastName,
							maskedLoginEmail: self.maskedLoginEmail,
							maskedLoginPhone: self.maskedLoginPhone,
							maskedAmka: self.maskedAmka,
							maskedAfm: self.maskedAfm,
							hasPatientProfile: self.hasPatientProfile
						}
					: null,
			failed: () => self === undefined && selfQuery.isError,
			retry: () => selfQuery.refetch(),
			abandoned: () => onSignInAbandoned?.(),
			expire: () => {
				ended = true;
				queryClient.setQueryData(authQueryKeys.patientSelf(), { signedIn: false });
			},
			// 🔴 D-W45-30 (screen 62): the account was deleted and its confirm cleared the cookies — a sign-out the server
			// has already carried out, so nothing is asked of it: this tab knows nobody, no write of the person waits, the
			// other tabs learn it, and the device forgets who it greeted.
			deleted: async () => {
				await queryClient.cancelQueries({ queryKey: authQueryKeys.patientSelf() });
				queryClient.setQueryData(authQueryKeys.patientSelf(), { signedIn: false });
				removeMutations(queryClient);
				forgetKnownAccount();
				signOutChannel?.announce();
			},
			// 🔴 R-2: the cookies are `HttpOnly` on the API, so only the API ends the session: if it did not, the page must not
			// say a guest, the person walks away, and the next one finds the account. A `401` has already ended it. A read on
			// its way (a focus) knows nothing of this, and must not write the member back.
			signOut: async () => {
				try {
					await logoutSession();
				} catch (error) {
					if (!(error instanceof ApiError && error.status === 401)) return false;
				}
				await queryClient.cancelQueries({ queryKey: authQueryKeys.patientSelf() });
				queryClient.setQueryData(authQueryKeys.patientSelf(), { signedIn: false });
				removeMutations(queryClient);
				signOutChannel?.announce();
				return true;
			}
		})
	);

	// 🔴 D-W3-37 (security web MINOR-2, NIT-1): a sign-out in another tab ended this session too (one cookie jar): this tab
	// knows nobody from now on, and keeps nothing of the person — no read, no write's body, no draft (`forgotten`).
	$effect(() => {
		const channel = openSignOutChannel(() => {
			void queryClient.cancelQueries({ queryKey: authQueryKeys.patientSelf() });
			queryClient.setQueryData(authQueryKeys.patientSelf(), { signedIn: false });
			removeMutations(queryClient);
			session.signedOutElsewhere();
		});
		signOutChannel = channel;
		return () => {
			channel.close();
			signOutChannel = null;
		};
	});

	// 🔴 U-153 (card w4-w12; live check w4-live-web-3 Δ5): the browser put this page back from its back/forward cache
	// (`pageshow`, `persisted`) as it was left — a session that had ended on a write, the sign-in still open over what was
	// written. Nobody is known to be there: it is left as by «×» (`close`), a guest's page that keeps none of it.
	$effect(() => {
		const shown = (event: PageTransitionEvent) => {
			if (event.persisted && session.expired && !session.isMember) close();
		};
		window.addEventListener('pageshow', shown);
		return () => window.removeEventListener('pageshow', shown);
	});

	const flow = setAuthFlow(
		new AuthFlowState(
			{
				locale: () => locale,
				loginPath: () => localized('/login'),
				returnPath: () => `${page.url.pathname}${page.url.search}`,
				pendingAction: () => session.pendingAction
			},
			queryClient
		)
	);

	// D-83: the profile is owed to a session without one that the server SAID is no doctor; never while either answer
	// is out, and a doctor is never asked.
	const lacksProfile = $derived(self?.signedIn === true && !self.hasPatientProfile);
	const doctorQuery = createQuery(() => ({
		queryKey: authQueryKeys.doctorAccount(),
		queryFn: ({ signal }: { signal: AbortSignal }) => getDoctorAccount(signal),
		enabled: lacksProfile
	}));
	const onboardingDue = $derived(
		lacksProfile &&
			doctorQuery.data?.ruledOut === true &&
			!isOnboardingExempt(deLocalizeHref(page.url.pathname))
	);

	$effect(() => {
		if (self?.signedIn) flow.rememberMember(self.firstName, self.maskedLoginEmail);
	});

	// A guest keeps nothing of a member's in this tab (the favourites, U-85), however the session ended: a sign-out here,
	// or an answer of the server that it has ended.
	$effect(() => {
		if (self?.signedIn !== false) return;
		removePersonalQueries(queryClient);
		queryClient.removeQueries({ queryKey: authQueryKeys.doctorAccount() });
	});

	// 🔴 U-65.6: another account in this tab (a sign-in over an ended session, a second tab) starts with nothing of the
	// last one's: no read and no draft. The same account signing in again finds its draft (`expire`). R-13: who a doctor
	// without a patient's profile is comes from the doctor's read this page makes anyway, with no request of its own.
	const account = $derived(
		self?.signedIn ? (self.accountKey ?? doctorQuery.data?.accountKey ?? null) : null
	);
	let lastAccount: string | undefined;
	$effect(() => {
		const known = account;
		if (!known) return;
		untrack(() => {
			if (lastAccount !== undefined && lastAccount !== known) {
				void resetPersonalQueries(queryClient);
				removeMutations(queryClient);
				session.accountChanged();
			}
			lastAccount = known;
		});
	});

	// The surface's life follows the session: every way in ends in the confirming read, so it is the one place that
	// closes the sign-in, runs what asked for it once and opens the owed profile.
	$effect(() => {
		const due = onboardingDue;
		const step = flow.currentStep;
		const open = session.flowOpen;
		const member = session.isMember;
		const afterSignIn = flow.isAfterSignIn;
		const decided = !lacksProfile || doctorQuery.isFetched;
		// What it runs (the action that asked) reads state of its own: none of it is this effect's business.
		untrack(() => {
			if (due) {
				if (step !== 'onboarding') flow.openOnboarding();
				if (!session.hasPageFlow) session.flowOpen = true;
				return;
			}
			if (step === 'onboarding') {
				flow.reset();
				if (member) session.completeSignIn();
				else session.cancelSignIn();
				return;
			}
			if (open && member && !afterSignIn && decided) {
				flow.reset();
				session.completeSignIn();
			}
		});
	});

	// Each opening starts on the application's first step.
	let wasOpen = false;
	$effect(() => {
		const open = session.flowOpen;
		if (open && !wasOpen && flow.currentStep !== 'onboarding') flow.open();
		wasOpen = open;
	});

	function close() {
		flow.reset();
		session.cancelSignIn();
	}

	// R-8: the surface asked from one page does not stay over another (the browser's «back»): what asked for it has gone
	// with its page. The owed profile stays: it has no way out but its own.
	afterNavigate(({ type, from, to }) => {
		if (type === 'enter' || !session.flowOpen || flow.currentStep === 'onboarding') return;
		if (from?.url.pathname !== to?.url.pathname) close();
	});

	function leaveAfterSignIn() {
		flow.reset();
		session.completeSignIn();
	}

	function dismiss() {
		if (flow.sub) {
			flow.sub = null;
			return;
		}
		if (flow.canClose) close();
	}

	const titleId = useId(undefined, 'auth-dialog-title');
	let windowHeight = $state(0);
</script>

{@render children()}

<!-- Ε1 (U-80.1): below 744 the sheet of the application's steps (12 under the top, the 24 corner, up from below), from
     744 the 480 window over the page it was asked from, its height following the step (the JS only measures). -->
<ModalScreenSurface
	open={session.flowOpen}
	shape="sheet"
	onDismiss={dismiss}
	aria-labelledby={titleId}
	data-testid="auth-dialog"
	style={windowHeight ? `--auth-window-h:${windowHeight}px` : undefined}
	class="transition-[transform,translate,border-radius,opacity,height] duration-sheet! ease-sheet! data-[state=closed]:translate-y-full tablet:h-auth-window! tablet:max-w-text tablet:data-[state=closed]:translate-y-0 starting:translate-y-full tablet:starting:translate-y-0"
>
	<AuthFlow
		{flow}
		{locale}
		{titleId}
		privacyHref={localized('/legal/privacy-policy')}
		termsHref={localized('/legal/terms-of-use')}
		deletionHref={localized('/account-deletion')}
		onClose={close}
		onLeaveAfterSignIn={leaveAfterSignIn}
		onWindowHeight={(height) => (windowHeight = height)}
	/>
</ModalScreenSurface>
