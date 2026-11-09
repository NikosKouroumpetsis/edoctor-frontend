import { createContext } from '$shared/lib/headless';

/**
 * What asked for the sign-in, a closed list (U-80.1 Ε4): it may travel in the address (`/login?do=`) and in the
 * tab's storage, so it is never free text. `doctor` (wave 3, P-W3 Σ-10): «Ξεκινήστε» of the doctor's sign-up goes on
 * after a provider's redirect, once.
 */
export const signInActions = ['fav', 'book', 'fee', 'contact', 'doctor'] as const;
export type SignInAction = (typeof signInActions)[number];

/** `unknown` until the browser has asked (the server never knows: the cookies live on the API, U-80.1 Ε6). */
export type SessionStatus = 'unknown' | 'guest' | 'member';

/**
 * `hasPatientProfile`: `false` for an account the server knows no patient for (a doctor's): what only a patient may do
 * says so before anything is written. Absent where the source does not know.
 */
export type SessionMember = { firstName: string | null; hasPatientProfile?: boolean };

/** Where the session's facts come from: the auth module's confirming read, never a copy of it. */
export type SessionSource = {
	status: () => SessionStatus;
	member: () => SessionMember | null;
	/** `false`: the server did not end the session, so it lives on and nothing here has changed. */
	signOut: () => Promise<boolean | void>;
	/** The browser asked and got no answer (an outage): a page waiting on the session says so instead of waiting on. */
	failed?: () => boolean;
	/** Asks again. */
	retry?: () => void;
	/** The server refused the session on a write: from here on the page knows nobody. */
	expire?: () => void;
	/** The visitor left the sign-in without finishing it: whatever waited for it goes. */
	abandoned?: () => void;
};

export type SignInRequest = {
	action?: SignInAction;
	/** Runs once, after the sign-in or at once for a member (a heart, «Κράτηση»). */
	onSignedIn?: () => void;
};

/**
 * The session as the rest of the site sees it, one per page tree (context, never a module singleton: a visitor's
 * state can never reach another's on the server). The auth module owns the flow and gives it its facts; the frame,
 * the pages and the cards only meet here (U-80.1): a card asks `requireSignIn`, never for a page of its own.
 */
export class Session {
	#source: SessionSource;
	#pending: SignInRequest | null = null;

	readonly status = $derived.by(() => this.#source.status());
	readonly member = $derived.by(() => this.#source.member());
	readonly isMember = $derived(this.status === 'member');
	readonly readFailed = $derived.by(() => this.#source.failed?.() ?? false);

	/** The window (from 744) or the sheet (below it) is open. */
	flowOpen = $state(false);
	/** The `/login` page draws the flow itself: asking there opens no second one. */
	hasPageFlow = $state(false);
	/** An action that came back through an address (`/login?do=`, a provider's redirect), waiting for its page. */
	resumedAction = $state<SignInAction | null>(null);
	/**
	 * 🔴 U-65.6: grows each time what a person wrote must leave the page: a sign-out, or another account in this tab. What
	 * a page keeps in its memory (a draft) watches it. A session that merely ended (`expire`) does not move it: the same
	 * person signs in again and finds the words.
	 */
	forgotten = $state(0);
	/** Grows each time the server did not carry out a sign-out: the member is still signed in, and the frame says so. */
	signOutFailures = $state(0);

	constructor(source: SessionSource) {
		this.#source = source;
	}

	/** U-80.1 Ε4: a member goes on at once; a guest signs in over the page, and the action runs once after it. */
	requireSignIn(request: SignInRequest = {}) {
		if (this.isMember) {
			request.onSignedIn?.();
			return;
		}
		this.#pending = request;
		if (!this.hasPageFlow) this.flowOpen = true;
	}

	/** What the open flow was asked for (it goes along with a provider's redirect). */
	get pendingAction(): SignInAction | null {
		return this.#pending?.action ?? null;
	}

	/** The sign-in ended well: the surface closes and what asked for it goes on, once. */
	completeSignIn() {
		const pending = this.#pending;
		this.#pending = null;
		this.flowOpen = false;
		pending?.onSignedIn?.();
	}

	/**
	 * 🔴 U-84: a write refused with `401`: the session has ended though the page still thought it lived. The page learns
	 * it now, and the sign-in opens over it; what asked for it goes on after it. The caller keeps the words it was sending.
	 */
	expire(request: SignInRequest = {}) {
		this.#source.expire?.();
		this.#pending = request;
		if (!this.hasPageFlow) this.flowOpen = true;
	}

	/** Another account came into this tab: what the last one wrote leaves the page. */
	accountChanged() {
		this.forgotten += 1;
	}

	/** The visitor left the flow: what asked for it is forgotten. */
	cancelSignIn() {
		this.#pending = null;
		this.flowOpen = false;
		this.#source.abandoned?.();
	}

	/** Marks an action that came back through an address, for the page that can run it. */
	resume(action: SignInAction | null) {
		// «fee» has nothing left to run: the page it came back to already shows the amount (N-5).
		this.resumedAction = action === 'fee' ? null : action;
	}

	/** Whether `action` was waiting; true only once. */
	takeResumed(action: SignInAction): boolean {
		if (this.resumedAction !== action) return false;
		this.resumedAction = null;
		return true;
	}

	/** Asks the server again after a failed read. */
	retryRead() {
		this.#source.retry?.();
	}

	/**
	 * 🔴 D-W3-37 (security web MINOR-2): another tab of this browser signed out — the cookies are the API's, one jar, so
	 * this tab's session has ended too: what waited for the sign-in goes, and what a person wrote leaves this page.
	 */
	signedOutElsewhere() {
		this.#pending = null;
		this.resumedAction = null;
		this.flowOpen = false;
		this.forgotten += 1;
	}

	/** 🔴 R-2: only a sign-out the server carried out takes what a person wrote and what waited for the sign-in. */
	async signOut(): Promise<void> {
		if ((await this.#source.signOut()) === false) {
			this.signOutFailures += 1;
			return;
		}
		this.#pending = null;
		this.resumedAction = null;
		this.forgotten += 1;
	}
}

export const [getSession, setSession, getSessionOptional] = createContext<Session>('Session');
