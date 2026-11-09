import { afterEach, describe, expect, it, vi } from 'vitest';
import { afterNavigate } from '$app/navigation';
import { useSiteBack } from './use-site-back.svelte';

type Navigated = (navigation: { from: unknown }) => void;

/** The hook as a page calls it, with the navigation SvelteKit reports after it (`from`: the page before, or none). */
function setup(from: unknown) {
	const onBack = useSiteBack();
	const [[listener]] = vi.mocked(afterNavigate).mock.calls as unknown as [[Navigated]];
	listener({ from });
	const event = new MouseEvent('click', { cancelable: true });
	const back = vi.spyOn(history, 'back').mockImplementation(() => {});
	onBack(event);
	return { event, back };
}

describe('shared::lib::navigation::useSiteBack', () => {
	afterEach(() => vi.restoreAllMocks());

	it('P-W3 Σ-12 (the profile’s, now shared): came from a page of the site ⇒ «‹» goes back in the history, the link is not followed', () => {
		const { event, back } = setup({ url: new URL('http://localhost/doctors?q=x') });
		expect(back).toHaveBeenCalledOnce();
		expect(event.defaultPrevented).toBe(true);
	});

	it('(negative) opened from outside (no page before) ⇒ «‹» follows its own link, the history is not touched', () => {
		const { event, back } = setup(null);
		expect(back).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});
});
