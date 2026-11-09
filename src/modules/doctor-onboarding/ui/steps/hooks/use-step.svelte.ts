import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { m } from '$paraglide/messages.js';
import { readHistoryDepth } from '$shared/lib/navigation';
import { personalQueryMeta } from '$shared/query';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import type { WizardScreenPill, WizardScreenProgress } from '$shared/ui/templates/wizard-screen';
import { doctorOnboardingQueryKeys } from '$modules/doctor-onboarding/api/keys';
import {
	doctorOnboardingProgressQuery,
	readDoctorOnboardingFailure,
	saveDoctorOnboardingStep,
	type DoctorOnboardingFailure,
	type DoctorOnboardingProgress,
	type DoctorOnboardingState,
	type DoctorOnboardingWrite
} from '$modules/doctor-onboarding/api/progress';
import {
	doctorOnboardingPath,
	doctorOnboardingStepOf,
	isDoctorOnboardingBeyondProgress,
	needsContactEmail,
	nextDoctorOnboardingStep,
	previousDoctorOnboardingStep,
	readDoctorOnboardingFill,
	resumeDoctorOnboardingStep,
	type DoctorOnboardingScreen,
	type DoctorOnboardingStep
} from '$modules/doctor-onboarding/lib/steps';
import { getOnboardingDraft } from '$modules/doctor-onboarding/ui/draft-host';
import type { DoctorOnboardingContext } from '../types';

const OPEN: readonly DoctorOnboardingState[] = ['IN_PROGRESS'];

/**
 * 🔴 U-112.2 · the one controller every page of the sign-up runs on (the application's `useDoctorOnboardingStep`): the
 * server's progress stays in TanStack Query, the doctor's unsaved answers in the root's draft (`OnboardingDraft`); a
 * write answers with the progress, written into the cache under the sign-out's mark. 🔴 D-W3-31: the address changes
 * only by a real navigation (`goto`, `history.back()`), never a shallow one: each page is an entry of its own and
 * carries how many steps lie behind it (`page.state.onboarding.depth`), so «Πίσω» and the browser's «back» agree. A
 * guest, or a sign-up that is not open (`states`), goes to the overview; a page beyond what the server holds goes to the
 * first missing step (P-W3 §3.3.3).
 */
export function useDoctorOnboardingStep(
	context: () => DoctorOnboardingContext,
	screen: DoctorOnboardingScreen,
	{
		states = OPEN
	}: {
		/** The states this page is open in; a function when they change while it lives (42 while it completes). */
		states?: readonly DoctorOnboardingState[] | (() => readonly DoctorOnboardingState[]);
	} = {}
) {
	const openIn = () => (typeof states === 'function' ? states() : states);
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const draft = getOnboardingDraft();
	const step: DoctorOnboardingStep = doctorOnboardingStepOf(screen);
	const options = $derived({ locale: context().locale });
	const signedIn = $derived(session?.isMember ?? false);

	const progressRead = createQuery(() => ({
		...doctorOnboardingProgressQuery(),
		enabled: browser && signedIn
	}));
	const progress = $derived<DoctorOnboardingProgress | undefined>(
		signedIn ? progressRead.data : undefined
	);
	const needsEmail = $derived(needsContactEmail(progress));
	// After a reload the entry still knows how many pages lie behind it (review w3-w3 R1 MINOR-5).
	const depthHere = () => readHistoryDepth('onboarding', page.state);
	// A page the person already left (a «back» while it saved) moves nobody: its late answer stays in the cache only.
	let here = true;
	$effect(() => () => {
		here = false;
	});

	let saveError = $state<string | null>(null);

	const hrefOf = (target: DoctorOnboardingScreen) => context().href(doctorOnboardingPath(target));
	const navigate = (target: DoctorOnboardingScreen, deeper: number, replaceState = false) =>
		here
			? // The sign-up's own address, resolved by the screen in the page's language.
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto(hrefOf(target), { replaceState, state: { onboarding: { depth: deeper } } })
			: Promise.resolve();

	// A guest, a sign-up not open, or a page ahead of the server's progress: the page that can be answered instead. Only a
	// visitor who came here as a guest, or one who signed out or changed account here (`forgotten`): a session that ended
	// under the page (`expire`, review w3-w3 R1 MAJOR-1) opens the sign-in over it, and the same person stays on it. Every
	// move waits for an answer of the browser's own reads, so none happens before the router has started (D-W3-31).
	let memberHere = false;
	const forgottenAtStart = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		if (!browser || screen === 'overview') return;
		const status = session?.status;
		const forgotten = session?.forgotten ?? 0;
		const known = progress;
		untrack(() => {
			if (status === 'member') memberHere = true;
			const leftAsGuest = status === 'guest' && !memberHere;
			if (
				leftAsGuest ||
				forgotten !== forgottenAtStart ||
				(known && !openIn().includes(known.state))
			) {
				void navigate('overview', 0, true);
				return;
			}
			if (known && isDoctorOnboardingBeyondProgress(screen, known)) {
				void navigate(resumeDoctorOnboardingStep(known), depthHere(), true);
			}
		});
	});

	/** The server's answer becomes the progress every page reads (marked first: a sign-out takes it, MAJOR-1). */
	function keep(next: DoctorOnboardingProgress | null): DoctorOnboardingProgress | null {
		if (!next) return null;
		client.setQueryDefaults(doctorOnboardingQueryKeys.all, { meta: personalQueryMeta });
		client.setQueryData(doctorOnboardingQueryKeys.progress(), next);
		return next;
	}

	// One write at a time, known at once: the mutation's own `isPending` reaches this code a tick late (TanStack's
	// notifications wait for a timer), which would refuse the write that follows another (42, 41's one retry). The
	// write itself, so «Αποθήκευση και έξοδος» can wait for it (review w3-w5 R1 NIT-1).
	let writing: Promise<DoctorOnboardingProgress | null> | null = null;
	// «Αποθήκευση και έξοδος» pressed while «Επόμενο» saved: once the write answers, the overview, not the next step.
	let leaving = false;
	const writer = createMutation(() => ({
		networkMode: 'always' as const,
		mutationFn: async (writes: readonly DoctorOnboardingWrite[]) => {
			let answer: DoctorOnboardingProgress | null = null;
			for (const write of writes) answer = keep(await saveDoctorOnboardingStep(write));
			return answer;
		}
	}));

	/**
	 * The frame's words for a refusal no screen reads itself (w3-b3's codes ⇒ the approved texts): the age and the
	 * doctors' terms say what to fix. 🔴 W8-Σ1: a refusal the server judged — a field, an office's mark (`400`, `409`,
	 * `422`) — and the rate (`429`) never say «check your connection»: the approved words of a refused form and of too
	 * many tries (the booking's relative says both so, `bookingRelativeFailureMessage`). 🔴 W8 Delta 1: nor does a state —
	 * the sign-up locked after three unfinished ones says the locked overview's own words (and the overview opens), the
	 * account locked for a while the approved «temporarily locked», a sign-up not started none: the overview opens. Any
	 * other `4xx` (Delta 2) the approved «Κάτι πήγε στραβά…»; only a lost request or a `5xx` says «…check your connection».
	 * On the overview the sign-up's lock adds no words: its own notice says them (Delta 2, NIT-1).
	 */
	function failureMessage(reason: DoctorOnboardingFailure): string | null {
		if (reason === 'not-started') return null;
		if (reason === 'registration-locked') {
			return screen === 'overview' ? null : m.doctor_onboarding_overview_locked({}, options);
		}
		if (reason === 'refused') return m.relatives_failure_unknown({}, options);
		if (reason === 'locked') return m.booking_details_errors_locked({}, options);
		if (reason === 'under-age') return m.doctor_onboarding_basic_under_age({}, options);
		if (reason === 'terms-not-accepted') return m.doctor_onboarding_terms_accept_hint({}, options);
		if (reason === 'invalid' || reason === 'outside-greece') {
			return m.relatives_failure_invalid({}, options);
		}
		if (reason === 'rate-limited') return m.booking_details_errors_rate_limited({}, options);
		return m.doctor_onboarding_frame_save_error({}, options);
	}

	/**
	 * Runs the step's writes in order; the last answer is the progress. A refusal keeps the edits and says so — in the
	 * frame's words, unless the step reads it itself (`onRefused`). 🔴 U-84: a `401` opens the sign-in over the page; the
	 * same person finds the words after it. A locked sign-up is read again: the guard takes it to the overview; one not
	 * started opens the overview at once, where it starts (W8 Delta 1).
	 */
	function save(
		writes: readonly DoctorOnboardingWrite[],
		onRefused?: (error: unknown, reason: DoctorOnboardingFailure) => boolean
	): Promise<DoctorOnboardingProgress | null> {
		if (writing) return Promise.resolve(null);
		const run = write(writes, onRefused).finally(() => {
			writing = null;
		});
		writing = run;
		return run;
	}

	async function write(
		writes: readonly DoctorOnboardingWrite[],
		onRefused?: (error: unknown, reason: DoctorOnboardingFailure) => boolean
	): Promise<DoctorOnboardingProgress | null> {
		saveError = null;
		try {
			const answer = await writer.mutateAsync(writes);
			if (!answer) saveError = m.doctor_onboarding_frame_save_error({}, options);
			return answer;
		} catch (error) {
			const reason = readDoctorOnboardingFailure(error);
			if (reason === 'session') {
				session?.expire({});
				return null;
			}
			if (reason === 'locked' || reason === 'registration-locked' || reason === 'not-started') {
				void client.invalidateQueries({ queryKey: doctorOnboardingQueryKeys.progress() });
			}
			if (onRefused?.(error, reason)) return null;
			saveError = failureMessage(reason);
			if (reason === 'not-started' && screen !== 'overview') void navigate('overview', 0, true);
			return null;
		}
	}

	/** «Επόμενο»: the step after this one, for the progress the last write answered (the email screens come and go). */
	function goNext(after?: DoctorOnboardingProgress | null) {
		if (!here || leaving) return;
		const target = nextDoctorOnboardingStep(step, needsContactEmail(after ?? progress));
		void navigate(target, depthHere() + 1);
	}

	/** «Πίσω» (and «←» of a screen a step opened): back through the history it came by, else the page before it. */
	function goBack() {
		if (!here) return;
		if (depthHere() > 0) {
			history.back();
			return;
		}
		const target = screen === step ? previousDoctorOnboardingStep(step, needsEmail) : step;
		void navigate(target, 0, true);
	}

	/**
	 * «Αποθήκευση και έξοδος»: a valid step is saved as «Επόμενο» saves it (`commit`); then the overview, told once. Pressed
	 * while «Επόμενο» saves (review w3-w5 R1 NIT-1), it waits for that write — this step's save — and leaves after it, never
	 * a silent nothing; a refused one stays with its words.
	 */
	async function saveAndExit(commit?: () => Promise<boolean>) {
		if (writing) {
			// The page's own «next» comes after this answer, and stays put: the person is leaving.
			leaving = true;
			let answer: DoctorOnboardingProgress | null = null;
			while (writing) answer = await writing;
			if (!answer || !here) {
				leaving = false;
				return;
			}
		} else if ((commit && !(await commit())) || !here) return;
		await navigate('overview', 0);
		toasts?.show({ message: m.doctor_onboarding_frame_saved({}, options), lift: 'page-bar' });
	}

	const fill = $derived(screen === step ? readDoctorOnboardingFill(step, needsEmail) : null);

	return {
		draft,
		client,
		session,
		step,
		get signedIn() {
			return signedIn;
		},
		get progress() {
			return progress;
		},
		/** The progress is here: a page draws its fields from it (and from the draft), never before. */
		get ready() {
			return progress !== undefined && openIn().includes(progress.state);
		},
		get loadError() {
			return signedIn && progress === undefined && progressRead.isError;
		},
		retry() {
			void progressRead.refetch();
		},
		get needsEmail() {
			return needsEmail;
		},
		get depth() {
			return depthHere();
		},
		get saving() {
			return writer.isPending;
		},
		get saveError() {
			return saveError;
		},
		set saveError(value: string | null) {
			saveError = value;
		},
		save,
		goNext,
		goBack,
		saveAndExit,
		hrefOf,
		/** Opens `target` as one more page (a screen a step opens, the next one). */
		open(target: DoctorOnboardingScreen) {
			if (!leaving) void navigate(target, depthHere() + 1);
		},
		/** This page gives its place to `target` (the search's choice ⇒ «Επιβεβαιώστε τη διεύθυνση»). */
		replace(target: DoctorOnboardingScreen) {
			if (!leaving) void navigate(target, depthHere(), true);
		},
		/** The bar's segments: the stage and how far into it this step is (none on the overview or a screen a step opens). */
		get bar(): WizardScreenProgress | undefined {
			return fill
				? {
						steps: 3,
						currentStep: fill.stage,
						fill: fill.fill,
						label: m.doctor_onboarding_frame_progress({ n: fill.stage + 1 }, options)
					}
				: undefined;
		},
		/**
		 * «Βοήθεια» (a new page, U-102: the draft keeps the words) and «Αποθήκευση και έξοδος» (not on the overview), locked
		 * while a write is out or the page is `busy` with its own chain (42's two writes, 41's version read; w3-w6 R1 NIT-1).
		 */
		pills(commit?: () => Promise<boolean>, busy = false): WizardScreenPill[] {
			const help: WizardScreenPill = {
				key: 'help',
				label: m.doctor_onboarding_frame_help_long({}, options),
				shortLabel: m.doctor_onboarding_frame_help({}, options),
				icon: 'help-circle-outline',
				href: context().helpHref,
				testId: 'doctor-onboarding-help'
			};
			if (screen === 'overview' || screen === 'done') return [help];
			return [
				help,
				{
					key: 'save-exit',
					label: m.doctor_onboarding_frame_save_exit({}, options),
					onClick: () => void saveAndExit(commit),
					disabled: busy || writer.isPending,
					testId: 'doctor-onboarding-save-exit'
				}
			];
		}
	};
}

export type DoctorOnboardingStepController = ReturnType<typeof useDoctorOnboardingStep>;
