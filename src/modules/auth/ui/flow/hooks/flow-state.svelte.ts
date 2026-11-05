import { createMutation, useQueryClient, type QueryClient } from '@tanstack/svelte-query';
import { createContext } from '$shared/lib/headless';
import { m } from '$paraglide/messages.js';
import { DEFAULT_PHONE_DIAL_CODE } from '$shared/ui/molecules/phone-field/countries';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	completeAccessRegistration,
	resendAccessCode,
	startAccess,
	verifyAccessCode
} from '$modules/auth/api/access';
import { getLegalDocumentVersion } from '$modules/auth/api/legal';
import { initSetPassword, setPassword } from '$modules/auth/api/password-credential';
import { leaveFor, providerStartUrl } from '$modules/auth/api/provider';
import {
	authQueryKeys,
	completePatientOnboarding,
	loginWithPassword
} from '$modules/auth/api/session';
import { authFlowLifetimes, authLegalDocuments } from '$modules/auth/config/sign-in';
import {
	isAlreadyOnboarded,
	isBirthDateRefusal,
	isLegalVersionRefusal,
	isPhoneRefusal,
	isRateLimited,
	isSpentTicket,
	isUnauthorized,
	readOtpFailure,
	readPasswordFailure,
	readSetPasswordCodeRejection,
	type SetPasswordCodeRejection
} from '$modules/auth/lib/failures';
import { isSameIdentifier, parseIdentifier } from '$modules/auth/lib/identifier';
import { emptyIdentityValues, toIdentitySubmission } from '$modules/auth/lib/identity';
import {
	readKnownAccount,
	writeKnownAccount,
	writePendingReturn
} from '$modules/auth/lib/known-account';
import { buildLegalAcceptance } from '$modules/auth/lib/legal-acceptance';
import { channelOf, maskIdentifier } from '$modules/auth/lib/masks';
import { buildLoginHref } from '$modules/auth/lib/return-path';
import type {
	AuthIdentifier,
	AuthIdentityValues,
	AuthLegalAcceptance,
	AuthProvider,
	AuthSignInMethod,
	KnownAccount
} from '$modules/auth/types';
import type { SignInAction } from '$shared/state/session';
import type {
	AuthResendFeedback,
	AuthStep,
	AuthStepFrame,
	AuthStepPhase,
	AuthSubSurface
} from '../types';

// The CSS moves a step in 0.25 s (`animate-auth-*`); only then the one that left goes from the stage.
const LEAVE_MS = 270;
const STEPS_WITHOUT_CLOSE: readonly AuthStep[] = ['onboarding'];
const STEPS_WITH_BACK: readonly AuthStep[] = [
	'otp',
	'password',
	'register',
	'set-password-code',
	'set-password-new'
];
const STEPS_AFTER_SIGN_IN: readonly AuthStep[] = [
	'set-password',
	'set-password-code',
	'set-password-new',
	'onboarding'
];

export type AuthFlowContext = {
	locale: () => SupportedLocale;
	/** The sign-in page's path in the page's language (`/login`, `/en/login`). */
	loginPath: () => string;
	/** Where the visitor goes on after a provider's redirect: the page the flow was asked from. */
	returnPath: () => string | null;
	/** What asked for the sign-in, when it goes along with a redirect. */
	pendingAction: () => SignInAction | null;
};

/**
 * 🔴 One flow for every host (Π6): the application's steps, order and rules, drawn in a sheet below 744, in the window
 * from 744 and on the `/login` page. Its memory is the application's `lib/flow-state`, kept per page tree in this
 * instance (never a module variable that could run on the server) and only in memory: the identifier is PII, the
 * ticket and the codes credentials, so nothing here reaches an address or a storage.
 */
export class AuthFlowState {
	#context: AuthFlowContext;
	#queryClient: QueryClient;
	#nextFrame = 1;
	#timer: ReturnType<typeof setTimeout> | undefined;

	frames = $state.raw<AuthStepFrame[]>([{ id: 0, step: 'entry', phase: 'still' }]);
	#stack: AuthStep[] = ['entry'];
	sub = $state<AuthSubSurface | null>(null);
	error = $state<string | null>(null);
	feedback = $state.raw<AuthResendFeedback | null>(null);

	identifier = $state.raw<AuthIdentifier | null>(null);
	entryValue = $state('');
	dialCode = $state(DEFAULT_PHONE_DIAL_CODE);
	recentCode = $state(false);
	code = $state('');
	setPasswordCode = $state('');
	setPasswordRejection = $state<SetPasswordCodeRejection | null>(null);
	known = $state.raw<KnownAccount | null>(null);
	/** The `/login` page's own way back (its checked `next`, `do`): it goes along with a provider's redirect. */
	pageReturn = $state.raw<{ next: string | null; action: SignInAction | null } | null>(null);
	/** The form's fields (never the password), so a step back does not cost what was typed. */
	draft = $state<AuthIdentityValues>({ ...emptyIdentityValues });
	busyProvider = $state<AuthProvider | null>(null);

	#challengeIssuedAt = 0;
	#ticket: string | null = null;
	#ticketIssuedAt = 0;
	#resendAvailableAt = 0;
	#setPasswordRequested = false;
	/** The identifier of the last sign-in in this visit: memory only, what «Σύνδεση» of the welcome step sends to. */
	#rememberedIdentifier: AuthIdentifier | null = null;
	/** The memory of a sign-in, until the confirming read names the person (after a provider, the mask too). */
	#pendingMemory:
		| (Omit<KnownAccount, 'firstName' | 'maskedIdentifier'> & { maskedIdentifier: string | null })
		| null = null;

	readonly currentStep = $derived(
		(this.frames.find((frame) => !frame.phase.startsWith('out')) ?? this.frames[0]).step
	);
	readonly canClose = $derived(!STEPS_WITHOUT_CLOSE.includes(this.currentStep));
	readonly canGoBack = $derived(STEPS_WITH_BACK.includes(this.currentStep));
	/** Past the sign-in itself (a password to set, a profile to complete): the surface stays for a member. */
	readonly isAfterSignIn = $derived(STEPS_AFTER_SIGN_IN.includes(this.currentStep));

	#start = createMutation(() => ({ mutationFn: startAccess }));
	#resend = createMutation(() => ({ mutationFn: resendAccessCode }));
	#verify = createMutation(() => ({
		mutationFn: (input: { identifier: AuthIdentifier; code: string }) =>
			verifyAccessCode(input.identifier, input.code)
	}));
	#login = createMutation(() => ({
		mutationFn: (input: { email: string; password: string }) =>
			loginWithPassword(input.email, input.password)
	}));
	#complete = createMutation(() => ({ mutationFn: completeAccessRegistration }));
	#onboard = createMutation(() => ({ mutationFn: completePatientOnboarding }));
	#initPassword = createMutation(() => ({ mutationFn: initSetPassword }));
	#setPassword = createMutation(() => ({
		mutationFn: (input: { code: string; password: string }) =>
			setPassword(input.code, input.password)
	}));

	readonly isStarting = $derived(this.#start.isPending);
	readonly isVerifying = $derived(this.#verify.isPending);
	readonly isLoggingIn = $derived(this.#login.isPending);
	readonly isRegistering = $derived(this.#complete.isPending);
	readonly isOnboarding = $derived(this.#onboard.isPending);
	readonly isSendingSetPassword = $derived(this.#initPassword.isPending);
	readonly isSavingPassword = $derived(this.#setPassword.isPending);

	constructor(context: AuthFlowContext, queryClient: QueryClient = useQueryClient()) {
		this.#context = context;
		this.#queryClient = queryClient;
	}

	get #options() {
		return { locale: this.#context.locale() };
	}

	get hasPasswordOption(): boolean {
		return Boolean(this.identifier && 'email' in this.identifier);
	}

	get resendSecondsLeft(): number {
		return Math.max(0, Math.ceil((this.#resendAvailableAt - Date.now()) / 1000));
	}

	/** The surface opens on the application's first step: «Καλωσορίσατε» for a browser that remembers. */
	open() {
		this.reset();
		this.known = readKnownAccount();
		this.#setStack([this.known ? 'welcome' : 'entry']);
	}

	/** Every way out: nothing of a half-done sign-in stays behind (`clearAuthFlow`). */
	reset() {
		this.#clearChallenge();
		this.entryValue = '';
		this.dialCode = DEFAULT_PHONE_DIAL_CODE;
		this.error = null;
		this.sub = null;
		this.#setStack(['entry']);
	}

	/** A line on the step, from outside it (`/login?error=google`). */
	showError(message: string) {
		this.error = message;
	}

	/** The profile is owed (D-83): the one step without a way out but its own. */
	openOnboarding() {
		this.error = null;
		this.sub = null;
		this.#setStack(['onboarding']);
	}

	back() {
		if (this.#stack.length < 2) return;
		this.#stack = this.#stack.slice(0, -1);
		this.error = null;
		this.feedback = null;
		this.sub = null;
		this.#move(this.#stack[this.#stack.length - 1], 'back');
	}

	#push(step: AuthStep, { replace = false }: { replace?: boolean } = {}) {
		this.#stack = [...(replace ? this.#stack.slice(0, -1) : this.#stack), step];
		this.error = null;
		this.sub = null;
		this.#move(step, 'forward');
	}

	#setStack(stack: AuthStep[]) {
		this.#stack = stack;
		if (this.#timer !== undefined) clearTimeout(this.#timer);
		this.frames = [
			{ id: this.#nextFrame++, step: stack[stack.length - 1], phase: 'still' as AuthStepPhase }
		];
	}

	/** A step in: the keyed frame under it stays on the stage to slide out (only the CSS moves them, U-12). */
	#move(step: AuthStep, direction: 'forward' | 'back') {
		const outgoing = this.frames.filter((frame) => !frame.phase.startsWith('out')).at(-1);
		const incoming: AuthStepFrame = {
			id: this.#nextFrame++,
			step,
			phase: direction === 'forward' ? 'in-forward' : 'in-back'
		};
		this.frames = [
			...(outgoing
				? [
						{
							...outgoing,
							phase: (direction === 'forward' ? 'out-forward' : 'out-back') as AuthStepPhase
						}
					]
				: []),
			incoming
		];
		if (this.#timer !== undefined) clearTimeout(this.#timer);
		this.#timer = setTimeout(() => {
			this.frames = this.frames
				.filter((frame) => frame.id === incoming.id)
				.map((frame) => ({ ...frame, phase: 'still' as AuthStepPhase }));
		}, LEAVE_MS);
	}

	#clearChallenge() {
		this.identifier = null;
		this.recentCode = false;
		this.code = '';
		this.setPasswordCode = '';
		this.setPasswordRejection = null;
		this.feedback = null;
		this.draft = { ...emptyIdentityValues };
		this.#challengeIssuedAt = 0;
		this.#ticket = null;
		this.#ticketIssuedAt = 0;
		this.#resendAvailableAt = 0;
		this.#setPasswordRequested = false;
	}

	#armChallenge(identifier: AuthIdentifier, recentCode: boolean) {
		this.#clearChallenge();
		this.identifier = identifier;
		this.recentCode = recentCode;
		this.#challengeIssuedAt = Date.now();
		this.#resendAvailableAt = Date.now() + authFlowLifetimes.resendCooldownMs;
	}

	get #challengeLive(): boolean {
		return (
			Boolean(this.identifier) &&
			Date.now() - this.#challengeIssuedAt < authFlowLifetimes.challengeMs
		);
	}

	get #ticketLive(): string | null {
		return this.#ticket && Date.now() - this.#ticketIssuedAt < authFlowLifetimes.ticketMs
			? this.#ticket
			: null;
	}

	/** «Συνέχεια»: an address or a number the field can read, else its one line. */
	submitEntry() {
		const identifier = parseIdentifier(this.entryValue, this.dialCode);
		if (!identifier) {
			this.error = m.auth_prompt_errors_identifier({}, this.#options);
			return;
		}
		void this.#continueWith(identifier);
	}

	/**
	 * A resubmit of the identifier the flow is following resumes it instead of asking the backend again; another one
	 * starts anew, and nothing the previous one left behind follows it (the application's `continueWithIdentifier`).
	 */
	async #continueWith(identifier: AuthIdentifier) {
		if (isSameIdentifier(this.identifier, identifier)) {
			if (this.#ticketLive) return this.#push('register');
			if (this.#challengeLive) return this.#push('otp');
		}
		this.error = null;
		try {
			const facts = await this.#start.mutateAsync(identifier);
			// A `200` that reports no send is a refusal too: no step without a code behind it.
			if (!facts.success) {
				this.error = m.auth_prompt_errors_unknown({}, this.#options);
				return;
			}
			this.#armChallenge(identifier, false);
			this.#push('otp');
		} catch (error) {
			// A throttled send means a code is already out there: the step opens saying so, no dead end.
			if (isRateLimited(error)) {
				this.#armChallenge(identifier, true);
				this.#push('otp');
				return;
			}
			this.error =
				isPhoneRefusal(error) && 'mobilePhone' in identifier
					? m.auth_prompt_errors_phone_number({}, this.#options)
					: m.auth_prompt_errors_unknown({}, this.#options);
		}
	}

	/**
	 * «Σύνδεση» of the welcome step: the identifier of this visit goes the way a typed one goes. A browser that only
	 * remembers the mask (Π3: the address itself is never stored) has nothing to send to: the entry step asks for it.
	 */
	signInKnown() {
		if (this.#rememberedIdentifier) {
			void this.#continueWith(this.#rememberedIdentifier);
			return;
		}
		this.useAnotherAccount();
	}

	/** «Δεν είστε εσείς;»: the entry step, for this visit. */
	useAnotherAccount() {
		this.error = null;
		this.#setStack(['entry']);
	}

	/** «Συνέχεια» on the code: only when asked, never on the sixth digit. */
	async submitCode() {
		const identifier = this.identifier;
		if (!identifier || this.isVerifying) return;
		this.error = null;
		this.feedback = null;
		try {
			const facts = await this.#verify.mutateAsync({ identifier, code: this.code });
			if (facts.outcome === 'signed-in') {
				// Before the confirming read, which would close the surface: «Ξέχασα» parked the request after the step opened.
				if (this.#setPasswordRequested) this.#push('set-password', { replace: true });
				await this.#signedIn(identifier, 'otp');
				return;
			}
			this.#ticket = facts.registrationTicket;
			this.#ticketIssuedAt = Date.now();
			// Replace: the code has been spent, so the form's back lands on the entry step.
			this.#push('register', { replace: true });
		} catch (error) {
			this.code = '';
			const options = this.#options;
			const messages = {
				'invalid-code': m.auth_otp_errors_invalid_code({}, options),
				locked: m.auth_otp_errors_locked({}, options),
				'rate-limited': m.auth_otp_errors_rate_limited({}, options),
				'stale-code': m.auth_otp_errors_stale_code({}, options),
				'sign-in-unavailable': m.auth_prompt_errors_sign_in_unavailable({}, options),
				unknown: m.auth_otp_errors_unknown({}, options)
			};
			this.error = messages[readOtpFailure(error)];
		}
	}

	/**
	 * The resend link is always there, so a refusal is spoken rather than hidden. Only this mirror may name seconds:
	 * the backend's `429` does not tell the 60 s spacing from the hourly cap.
	 */
	async resendCode() {
		const identifier = this.identifier;
		if (!identifier || this.#resend.isPending || this.isVerifying) return;
		const left = this.resendSecondsLeft;
		if (left > 0) {
			this.feedback = {
				kind: 'wait',
				message: m.auth_otp_resend_wait({ seconds: left }, this.#options)
			};
			return;
		}
		this.error = null;
		this.feedback = null;
		try {
			const facts = await this.#resend.mutateAsync(identifier);
			if (!facts.success) {
				this.error = m.auth_otp_errors_unknown({}, this.#options);
				return;
			}
			this.#resendAvailableAt = Date.now() + authFlowLifetimes.resendCooldownMs;
			this.code = '';
			this.feedback = { kind: 'sent', message: m.auth_otp_resend_sent({}, this.#options) };
		} catch (error) {
			if (isRateLimited(error)) {
				this.#resendAvailableAt = Date.now() + authFlowLifetimes.resendCooldownMs;
				this.feedback = {
					kind: 'wait',
					message: m.auth_otp_errors_rate_limited({}, this.#options)
				};
				return;
			}
			this.error = m.auth_otp_errors_unknown({}, this.#options);
		}
	}

	usePassword() {
		this.sub = null;
		this.#push('password');
	}

	async submitPassword(password: string): Promise<boolean> {
		const identifier = this.identifier;
		if (!identifier || !('email' in identifier) || this.isLoggingIn) return false;
		this.error = null;
		try {
			await this.#login.mutateAsync({ email: identifier.email, password });
			await this.#signedIn(identifier, 'password');
			return true;
		} catch (error) {
			const options = this.#options;
			const messages = {
				'wrong-credentials': m.auth_password_errors_wrong_credentials({}, options),
				'rate-limited': m.auth_password_errors_rate_limited({}, options),
				'sign-in-unavailable': m.auth_prompt_errors_sign_in_unavailable({}, options),
				unknown: m.auth_password_errors_unknown({}, options)
			};
			this.error = messages[readPasswordFailure(error)];
			return false;
		}
	}

	/** «Ξέχασα»: nobody may set a password before signing in, so the request waits and the code step is the way in. */
	forgotPassword() {
		this.#setPasswordRequested = true;
		this.back();
	}

	/** The published versions, read when asked (`refresh` for the one retry a moved version earns). */
	async #readLegalAcceptance(refresh: boolean): Promise<AuthLegalAcceptance | null> {
		const lang = this.#context.locale();
		const documents = await Promise.all(
			authLegalDocuments.map(async (document) => ({
				documentCode: document.documentCode,
				version: await this.#queryClient.fetchQuery({
					queryKey: authQueryKeys.legalVersion(document.slug, lang),
					queryFn: () => getLegalDocumentVersion(document.slug, lang),
					staleTime: refresh ? 0 : 60_000,
					// Without a network it fails at once and says so, rather than waiting unseen for one.
					networkMode: 'always'
				})
			}))
		);
		return buildLegalAcceptance(documents);
	}

	/** «Αποδοχή και συνέχεια»: the ticket is the gate, and a moved legal version earns one retry. */
	async submitRegistration(values: AuthIdentityValues, password: string | null, retried = false) {
		const options = this.#options;
		const identifier = this.identifier;
		const registrationTicket = this.#ticketLive;
		if (!identifier || !registrationTicket) {
			this.error = m.auth_register_errors_ticket_expired({}, options);
			return;
		}
		this.error = null;
		const legalAcceptance = await this.#readLegalAcceptance(retried).catch(() => null);
		if (!legalAcceptance) {
			this.error = m.auth_register_errors_legal_versions({}, options);
			return;
		}
		try {
			await this.#complete.mutateAsync({
				...toIdentitySubmission(values),
				language: this.#context.locale(),
				legalAcceptance,
				registrationTicket,
				...(password ? { password } : {})
			});
			await this.#signedIn(identifier, 'otp', values.firstName.trim());
		} catch (error) {
			if (isSpentTicket(error)) {
				this.#clearChallenge();
				this.#setStack(['entry']);
				this.error = m.auth_register_errors_ticket_expired({}, options);
				return;
			}
			if (!retried && isLegalVersionRefusal(error)) {
				await this.submitRegistration(values, password, true);
				return;
			}
			this.error = isBirthDateRefusal(error)
				? m.auth_register_errors_birth_date_invalid({}, options)
				: m.auth_register_errors_unknown({}, options);
		}
	}

	/** The completion surface's submit; closing it is the confirming read's, not this call's. */
	async submitOnboarding(values: AuthIdentityValues) {
		const options = this.#options;
		this.error = null;
		try {
			await this.#onboard.mutateAsync({
				...toIdentitySubmission(values),
				language: this.#context.locale()
			});
		} catch (error) {
			if (!isAlreadyOnboarded(error)) {
				this.error = isBirthDateRefusal(error)
					? m.auth_register_errors_birth_date_invalid({}, options)
					: m.auth_onboarding_errors_unknown({}, options);
				return;
			}
		}
		await this.#queryClient.invalidateQueries({ queryKey: authQueryKeys.patientSelf() });
	}

	async sendSetPasswordCode() {
		if (this.isSendingSetPassword) return;
		const options = this.#options;
		this.error = null;
		try {
			await this.#initPassword.mutateAsync();
			// Pushed: a code that never arrives leaves «ask again» one step back.
			this.#push('set-password-code');
		} catch (error) {
			this.error = isRateLimited(error)
				? m.auth_set_password_errors_rate_limited({}, options)
				: isUnauthorized(error)
					? m.auth_set_password_errors_unauthorized({}, options)
					: m.auth_set_password_errors_unknown({}, options);
		}
	}

	/** The code travels to the next step in memory, never in an address: the backend takes both halves in one call. */
	acceptSetPasswordCode() {
		this.setPasswordRejection = null;
		this.#push('set-password-new');
	}

	/** Saves the password; a refusal about the code goes back to the step that owns the cells. */
	async saveNewPassword(newPassword: string): Promise<boolean> {
		if (this.isSavingPassword) return false;
		const options = this.#options;
		this.error = null;
		try {
			await this.#setPassword.mutateAsync({ code: this.setPasswordCode, password: newPassword });
			return true;
		} catch (error) {
			const rejection = readSetPasswordCodeRejection(error);
			if (rejection) {
				this.setPasswordRejection = rejection;
				this.setPasswordCode = '';
				this.back();
				return false;
			}
			this.error = isRateLimited(error)
				? m.auth_set_password_new_password_errors_rate_limited({}, options)
				: isUnauthorized(error)
					? m.auth_set_password_new_password_errors_unauthorized({}, options)
					: m.auth_set_password_errors_unknown({}, options);
			return false;
		}
	}

	/**
	 * Google and Apple (Π6, `P-B-backend.md` §8.3): a whole-page visit with no script of theirs on our pages. The
	 * versions published right now go along (a new account is made on their side of the door), read afresh: an API that
	 * does not answer stays a line here. Nothing asks the start first: whatever it refuses, it answers on
	 * `/login?error=` (`w2-b5` §2), and a look ahead would spend a `state` and the sign-in's rate limit.
	 */
	async startProvider(provider: AuthProvider) {
		if (this.busyProvider) return;
		const options = this.#options;
		const failed =
			provider === 'google'
				? m.auth_prompt_errors_google_failed({}, options)
				: m.auth_prompt_errors_apple_failed({}, options);
		this.error = null;
		this.busyProvider = provider;
		this.#clearChallenge();
		try {
			const legalAcceptance = await this.#readLegalAcceptance(true).catch(() => null);
			if (!legalAcceptance) {
				this.error = m.auth_register_errors_legal_versions({}, options);
				return;
			}
			const next = this.pageReturn ? this.pageReturn.next : this.#context.returnPath();
			const action = this.pageReturn ? this.pageReturn.action : this.#context.pendingAction();
			const way = buildLoginHref(this.#context.loginPath(), { next, action, via: provider });
			const url = providerStartUrl(provider, {
				redirectUrl: `${window.location.origin}${way}`,
				legalAcceptance
			});
			writePendingReturn({ next, action });
			leaveFor(url);
		} catch {
			this.error = failed;
		} finally {
			this.busyProvider = null;
		}
	}

	/** Every way in: remember the door, then ask the server who this is — the surface closes on its answer. */
	async #signedIn(identifier: AuthIdentifier, method: AuthSignInMethod, firstName?: string) {
		this.#rememberedIdentifier = identifier;
		const memory = {
			maskedIdentifier: maskIdentifier(identifier),
			channel: channelOf(identifier),
			lastMethod: method
		};
		if (firstName) writeKnownAccount({ ...memory, firstName });
		else this.#pendingMemory = memory;
		await this.#queryClient.invalidateQueries({ queryKey: authQueryKeys.patientSelf() });
	}

	/**
	 * `/login?via=`: back from a provider, whose answer the browser never saw. The door is known here; who it was, only
	 * the confirming read can say. A guest's read writes nothing, and a sign-in of another kind takes its place.
	 */
	expectProviderReturn(provider: AuthProvider) {
		this.#pendingMemory = { maskedIdentifier: null, channel: 'email', lastMethod: provider };
	}

	/**
	 * The confirming read named the person: the memory of «Καλωσορίσατε» can be written. A session with no patient's
	 * profile yet is named by nothing, so it waits, and nothing is written for an account that never gets one.
	 */
	rememberMember(firstName: string | null, maskedLoginEmail: string | null) {
		const memory = this.#pendingMemory;
		const maskedIdentifier = memory?.maskedIdentifier ?? maskedLoginEmail;
		if (!memory || !firstName || !maskedIdentifier) return;
		writeKnownAccount({ ...memory, maskedIdentifier, firstName });
		this.#pendingMemory = null;
	}
}

export const [getAuthFlow, setAuthFlow, getAuthFlowOptional] =
	createContext<AuthFlowState>('AuthFlow');
