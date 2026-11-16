import { createContext } from '$shared/lib/headless';

/**
 * Where an account stands as a doctor, as every page reads it (D-W51-10, U-185.1): `none` no completed registration (no
 * doctor, one in progress, one locked) · `pending` a completed registration with no licence (U-183.5) · `doctor` a
 * licence of the marketplace (an expired one too, U-185.2) — the only one with a doctor mode on the web · `payments` a
 * licence of the till alone, which the web has no screen for (D-W51-16: no doctor mode here in 5.1).
 */
export type DoctorStandingKind = 'none' | 'pending' | 'doctor' | 'payments';

/** The two dashboards (D-W51-11): the one the account opens in next time. */
export type DoctorMode = 'PATIENT' | 'DOCTOR';

/** U-185.2: the licence's notice above «Σήμερα» — the server's to compute, the page's only to say. */
export type DoctorLicenceNotice = { kind: 'EXPIRING' | 'EXPIRED'; endsAt: string };

/** The doctor menu's name card (U-164.1: never pressed); the specialty only from the catalogue (U-122). */
export type DoctorNameCard = {
	firstName: string | null;
	lastName: string | null;
	specialtyName: string | null;
};

/** What the server answered for the session's own account, as the pages need it. */
export type DoctorStandingFacts = {
	kind: DoctorStandingKind;
	notice: DoctorLicenceNotice | null;
	lastMode: DoctorMode;
	card: DoctorNameCard | null;
};

/** 🔴 D-W51-19: what this device remembered before the answer — the kind and the mode, nothing of the person. */
export type DoctorStandingHint = { kind: DoctorStandingKind; lastMode: DoctorMode };

/** Where the standing comes from: the doctor-dashboard module's one read and its one write, never a copy of them. */
export type DoctorStandingSource = {
	/** `undefined` until the read answers, `null` for nobody to read (a guest). */
	facts: () => DoctorStandingFacts | null | undefined;
	/** The device's memory, read only while the answer is not here. */
	hint?: () => DoctorStandingHint | null;
	/** The read got no answer (an outage): a page waiting on it says so instead of waiting on. */
	failed?: () => boolean;
	retry?: () => void;
	/** The mode the person chose: kept on the server, the transition drawn, the page of that mode opened. */
	switchTo: (mode: DoctorMode) => Promise<boolean>;
	/** The mode a switch is on its way to, while it runs. */
	switching?: () => DoctorMode | null;
	/** Grows each time the server did not keep a switch: the frame says so (the sign-out's `signOutFailures` way). */
	failures?: () => number;
};

/**
 * 🔴 Wave 5.1 · screens 64 / 65 (D-W51-10, D-W51-19): the account's doctor standing as the rest of the site sees it, one
 * per page tree (context, never a module singleton) — the doctor-dashboard module owns the ONE read and the switch, and
 * the patient's frame, the «Προφίλ», the sign-up and the doctor's frame only read it; none of them imports another
 * (the precedent of `NotificationBadge`, D-W45-17). Before the answer it says what this device remembered (`hint`).
 */
export class DoctorStanding {
	#source: DoctorStandingSource;

	readonly facts = $derived.by(() => this.#source.facts());
	/** The server answered for this account, or there is no account. */
	readonly known = $derived(this.facts !== undefined);
	readonly failed = $derived.by(
		() => this.facts === undefined && (this.#source.failed?.() ?? false)
	);
	readonly #hint = $derived.by(() =>
		this.facts === undefined ? (this.#source.hint?.() ?? null) : null
	);
	/** Before the answer, this device remembered the account (D-W51-19): a page may draw from it at once. */
	readonly hinted = $derived(this.#hint !== null);
	readonly kind = $derived<DoctorStandingKind>(
		this.facts ? this.facts.kind : this.facts === null ? 'none' : (this.#hint?.kind ?? 'none')
	);
	/** U-185.1 · D-W51-16: «Λειτουργία γιατρού» exists only for a marketplace licence (an expired one too). */
	readonly canEnterDoctorMode = $derived(this.kind === 'doctor');
	readonly lastMode = $derived<DoctorMode>(
		this.facts
			? this.facts.lastMode
			: this.facts === null
				? 'PATIENT'
				: (this.#hint?.lastMode ?? 'PATIENT')
	);
	readonly notice = $derived(this.facts?.notice ?? null);
	readonly card = $derived(this.facts?.card ?? null);
	readonly switching = $derived.by(() => this.#source.switching?.() ?? null);
	readonly switchFailures = $derived.by(() => this.#source.failures?.() ?? 0);

	constructor(source: DoctorStandingSource) {
		this.#source = source;
	}

	/** «Λειτουργία γιατρού» / «Λειτουργία ασθενή»: `false` when the server did not keep it (nothing moved). */
	switchTo(mode: DoctorMode): Promise<boolean> {
		return this.#source.switchTo(mode);
	}

	retry() {
		this.#source.retry?.();
	}
}

export const [getDoctorStanding, setDoctorStanding, getDoctorStandingOptional] =
	createContext<DoctorStanding>('DoctorStanding');
