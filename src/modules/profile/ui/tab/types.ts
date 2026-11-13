import type { Snippet } from 'svelte';
import type { ResolvedPathname } from '$app/types';
import type { ProfileMenuRowId } from '$modules/profile/types';

export type ProfileTabProps = {
	locale: 'el' | 'en';
	/** A row that is a page: its address in the page's language. */
	hrefOf: (row: ProfileMenuRowId) => ResolvedPathname | null;
	/** A row that is a window of the frame (a guest's «Ρυθμίσεις λογαριασμού»). */
	onRow: (row: ProfileMenuRowId) => void;
	/** «Είστε γιατρός;»: the doctor's sign-up, in the page's language (D-W45-20). */
	doctorHref: ResolvedPathname;
	/**
	 * What sits at the end of a member's title row — the bell of screen 63 (D-W45-17: it comes with that screen, so
	 * nothing is drawn there until a caller hands it in).
	 */
	headerAction?: Snippet;
};
