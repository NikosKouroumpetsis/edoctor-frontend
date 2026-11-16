import type { Snippet } from 'svelte';

export type DoctorMenuProps = {
	locale: 'el' | 'en';
	/** What sits at the end of the title row — the bell of screen 63, handed in by the screen (a module knows no other). */
	headerAction?: Snippet;
};
