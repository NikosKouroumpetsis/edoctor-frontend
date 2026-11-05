import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import ExpandableText from './expandable-text.svelte';

/** jsdom lays nothing out: the words count as cut when their scroll height passes their box. */
function layOut(scrollHeight: number, clientHeight: number) {
	vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
}

describe('ExpandableText (U-66.1 Π7)', () => {
	it('cut words: four lines and the press, which opens them in their place', async () => {
		layOut(240, 96);
		render(ExpandableText, {
			props: { text: 'Κείμενο', moreLabel: 'Εμφάνιση περισσότερων', testId: 'words' }
		});
		await tick();
		const words = screen.getByTestId('words');
		expect(words).toHaveClass('line-clamp-4');
		await fireEvent.click(screen.getByTestId('words-more'));
		await tick();
		expect(words).not.toHaveClass('line-clamp-4');
		expect(screen.queryByTestId('words-more')).toBeNull();
		vi.restoreAllMocks();
	});

	it('U-73.1 Π5: `lines` cuts at six; `chevron` writes «›» on the press', async () => {
		layOut(240, 144);
		render(ExpandableText, {
			props: { text: 'Κείμενο', moreLabel: 'Περισσότερα', lines: 6, chevron: true, testId: 'words' }
		});
		await tick();
		expect(screen.getByTestId('words')).toHaveClass('line-clamp-6');
		expect(screen.getByTestId('words')).not.toHaveClass('line-clamp-4');
		expect(screen.getByTestId('words-more').querySelector('svg')).not.toBeNull();
		vi.restoreAllMocks();
	});

	it('words that fit: no press', async () => {
		layOut(48, 96);
		render(ExpandableText, { props: { text: 'Λίγα', moreLabel: 'Περισσότερα', testId: 'words' } });
		await tick();
		expect(screen.queryByTestId('words-more')).toBeNull();
		vi.restoreAllMocks();
	});

	it('U-66.1 Π6: a search never cuts the words, a match past the fourth line stays in sight', async () => {
		layOut(240, 96);
		render(ExpandableText, {
			props: { text: 'Κείμενο', moreLabel: 'Περισσότερα', whole: true, testId: 'words' }
		});
		await tick();
		expect(screen.getByTestId('words')).not.toHaveClass('line-clamp-4');
		expect(screen.queryByTestId('words-more')).toBeNull();
		vi.restoreAllMocks();
	});

	it('U-65.6 (negative): a review with markup stays words, with or without a search', async () => {
		const text = '<b>καλή</b> <script>alert(1)</script> <img src=x onerror=alert(1)>';
		const { container, rerender } = render(ExpandableText, {
			props: { text, moreLabel: 'Περισσότερα', testId: 'words' }
		});
		expect(screen.getByTestId('words').textContent).toContain(text);
		expect(container.querySelector('b, script, img')).toBeNull();
		await rerender({ text, moreLabel: 'Περισσότερα', testId: 'words', query: 'καλη', whole: true });
		expect(screen.getByTestId('words').textContent).toContain(text);
		expect(container.querySelector('b, script, img')).toBeNull();
		expect(container.querySelector('[data-slot="highlight-text-match"]')?.textContent).toBe('καλή');
	});
});
