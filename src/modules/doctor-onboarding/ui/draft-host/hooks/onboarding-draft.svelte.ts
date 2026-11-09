import { untrack } from 'svelte';
import { createContext } from '$shared/lib/headless';
import { getSessionOptional } from '$shared/state/session';
import type {
	DoctorOnboardingDraftFields,
	DoctorOnboardingDraftSection,
	DoctorOnboardingEdits
} from '$modules/doctor-onboarding/types';

/**
 * 🔴 U-112.2 (the owner, 07/11: «να μην χανονται τα στοιχεια»), U-65.6: what a doctor changed on the sign-up's screens
 * and has not yet sent with «Επόμενο» — only that (an overlay: the server's progress stays in TanStack Query, never
 * copied here, P-W3 Σ-5). One per page tree (context, never a module singleton: on the server each request makes its
 * own, empty, so no visitor's words reach another's page). Only in this rune: never a storage, a cookie, an address or a
 * log. A sign-out or another account in the tab empties it; a session that merely ended (`expire`) does not.
 */
export class OnboardingDraft {
	edits = $state<DoctorOnboardingEdits>({});

	/** Whether anything waits for its «Επόμενο». */
	readonly dirty = $derived(
		Object.values(this.edits).some((part) => part !== undefined && Object.keys(part).length > 0)
	);

	/** The person's changes to one part, over the ones made before. */
	update<S extends DoctorOnboardingDraftSection>(
		section: S,
		patch: Partial<DoctorOnboardingDraftFields[S]>
	): void {
		this.edits[section] = { ...this.edits[section], ...patch } as DoctorOnboardingEdits[S];
	}

	/**
	 * The value a screen shows: the person's own when they changed it (even to empty or none), else `fallback` (the
	 * server's progress, or the step's default). A key, not a `??`: «no place id» is a choice too (a manual address).
	 */
	read<S extends DoctorOnboardingDraftSection, F extends keyof DoctorOnboardingDraftFields[S]>(
		section: S,
		field: F,
		fallback: DoctorOnboardingDraftFields[S][F]
	): DoctorOnboardingDraftFields[S][F] {
		const part = this.edits[section] as Partial<DoctorOnboardingDraftFields[S]> | undefined;
		return part !== undefined && Object.hasOwn(part, field)
			? (part[field] as DoctorOnboardingDraftFields[S][F])
			: fallback;
	}

	/** After the server took a step: that part's changes go — all of them, or only `fields` (one screen of the office). */
	clear<S extends DoctorOnboardingDraftSection>(
		section: S,
		fields?: readonly (keyof DoctorOnboardingDraftFields[S])[]
	): void {
		const part = this.edits[section];
		if (part === undefined) return;
		if (fields === undefined) {
			delete this.edits[section];
			return;
		}
		const left = { ...part } as Record<PropertyKey, unknown>;
		for (const field of fields) delete left[field];
		if (Object.keys(left).length === 0) delete this.edits[section];
		else this.edits[section] = left as DoctorOnboardingEdits[S];
	}

	/** Everything goes (a sign-out, another account, the sign-up completed). */
	forget(): void {
		this.edits = {};
	}
}

export const [getOnboardingDraft, setOnboardingDraft, getOnboardingDraftOptional] =
	createContext<OnboardingDraft>('OnboardingDraft');

/** 🔴 U-112.2, U-65.6: a new draft, which a sign-out or another account empties, on whichever page they happen. */
export function useOnboardingDraft(): OnboardingDraft {
	const session = getSessionOptional();
	const draft = new OnboardingDraft();
	let seen = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		const forgotten = session?.forgotten ?? 0;
		if (forgotten === seen) return;
		seen = forgotten;
		untrack(() => draft.forget());
	});
	return draft;
}
