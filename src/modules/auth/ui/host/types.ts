import type { Snippet } from 'svelte';

export type AuthHostProps = {
	children: Snippet;
	/**
	 * The visitor left the sign-in without finishing it. What another module left waiting in the tab for it goes here:
	 * the composition names it (`src/routes/+layout.svelte`), so the sign-in never has to know.
	 */
	onSignInAbandoned?: () => void;
};
