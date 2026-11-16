import type { Snippet } from 'svelte';

/** One of the doctor's tabs in the bar (from 744): its words, its page, whether it is the page shown. */
export type DoctorFrameLink = {
	key: 'today' | 'messages';
	label: string;
	href: string;
	current: boolean;
};

export type DoctorFrameProps = { children: Snippet };
