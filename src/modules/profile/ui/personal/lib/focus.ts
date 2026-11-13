import { tick } from 'svelte';

/**
 * After a refusal — the page's own check or the server's — the first field marked wrong takes the focus, once the page
 * has drawn it so (`aria-invalid`); with none marked the focus stays where it is.
 */
export async function focusFirstInvalid(root: HTMLElement | null): Promise<void> {
	await tick();
	root?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
